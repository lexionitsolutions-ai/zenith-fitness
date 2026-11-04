import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";

const database = vi.hoisted(() => ({
  member: { findMany: vi.fn() },
  pointTransaction: { createMany: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/database/prisma", () => ({ prisma: database }));

const memberA = "00000000-0000-4000-8000-000000000001";
const memberB = "00000000-0000-4000-8000-000000000002";
const payload = { memberIds: [memberA, memberB] };
const activeMember = (id: string, admissionId: string) => ({
  id, admissionId, fullName: "Member", qrCodeActive: true,
  memberships: [{ startDate: new Date("2026-11-01Z"), endDate: new Date("2026-11-30Z") }],
});
const request = (body = payload) => new Request("http://localhost/api/admin/award-points", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-08T16:00:00Z"));
  vi.mocked(getSession).mockResolvedValue({ userId: "admin", memberId: null, role: "ADMIN" });
  database.member.findMany.mockResolvedValue([activeMember(memberA, "ZF-1"), activeMember(memberB, "ZF-2")]);
  database.pointTransaction.createMany.mockResolvedValue({ count: 2 });
  database.$transaction.mockImplementation(async callback => callback(database));
});

afterEach(() => vi.useRealTimers());

describe("admin bulk daily attendance", () => {
  it.each(["STAFF", "MEMBER", null] as const)("rejects %s sessions before searching or awarding", async role => {
    vi.mocked(getSession).mockResolvedValue(role ? { userId: "other", memberId: null, role } : null);
    expect((await POST(request())).status).toBe(403);
    expect((await GET(new Request("http://localhost/api/admin/award-points?q=Alpha"))).status).toBe(403);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(database.member.findMany).not.toHaveBeenCalled();
  });

  it("awards only the standard daily visit points with the admin and photo verification recorded", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect((await response.json()).data).toEqual({ awardedCount: 2, alreadyAwardedCount: 0, selectedCount: 2, points: 5 });
    expect(database.$transaction).toHaveBeenCalledTimes(1);
    const { data, skipDuplicates } = database.pointTransaction.createMany.mock.calls[0][0];
    expect(skipDuplicates).toBe(true);
    expect(data.map((row: { memberId: string }) => row.memberId)).toEqual([memberA, memberB]);
    for (const row of data) expect(row).toMatchObject({ points: 5, transactionType: "DAILY_VISIT", description: "Daily attendance verified by admin from photo", awardedByUserId: "admin", businessDate: expect.any(Date) });
    expect(data[0].referenceKey).toBe(`daily:${memberA}:2026-11-08`);
    expect(data[1].referenceKey).toBe(`daily:${memberB}:2026-11-08`);
  });

  it("deduplicates selected members", async () => {
    database.member.findMany.mockResolvedValue([activeMember(memberA, "ZF-1")]);
    await POST(request({ ...payload, memberIds: [memberA, memberA] }));
    expect(database.pointTransaction.createMany.mock.calls[0][0].data).toHaveLength(1);
  });

  it("skips attendance already marked by QR and duplicate photo submissions", async () => {
    const saved = new Set<string>([`daily:${memberA}:2026-11-08`]);
    database.pointTransaction.createMany.mockImplementation(async ({ data }) => {
      let count = 0;
      for (const row of data) if (!saved.has(row.referenceKey)) { saved.add(row.referenceKey); count++; }
      return { count };
    });
    const first = (await (await POST(request())).json()).data;
    expect(first.awardedCount).toBe(1);
    expect(first.alreadyAwardedCount).toBe(1);
    expect((await (await POST(request())).json()).data.awardedCount).toBe(0);
    expect(saved.size).toBe(2);
  });

  it("rejects a batch containing an unknown member before writing points", async () => {
    database.member.findMany.mockResolvedValue([activeMember(memberA, "ZF-1")]);
    expect((await POST(request())).status).toBe(404);
    expect(database.pointTransaction.createMany).not.toHaveBeenCalled();
  });

  it.each([
    { points: 0 }, { points: -5 }, { points: 1.5 }, { points: 10001 },
    { memberIds: [] }, { memberIds: ["bad-id"] }, { memberIds: Array(201).fill(memberA) },
    { description: "Bonus points" }, { points: 5 },
  ])("rejects invalid award input %j", async change => {
    expect((await POST(request({ ...payload, ...change }))).status).toBe(400);
    expect(database.$transaction).not.toHaveBeenCalled();
  });

  it("returns an error if the atomic batch write fails", async () => {
    database.pointTransaction.createMany.mockRejectedValue(new Error("Database unavailable"));
    const response = await POST(request());
    expect(response.status).toBe(500);
    expect((await response.json()).success).toBe(false);
  });

  it("searches names and IDs and returns full member IDs", async () => {
    const response = await GET(new Request("http://localhost/api/admin/award-points?q=2"));
    expect(response.status).toBe(200);
    expect((await response.json()).data[0].admissionId).toBe("ZF-1");
    expect(database.member.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { OR: expect.arrayContaining([{ admissionId: "ZF-2" }]) }, take: 30,
    }));
  });

  it("suggests names matching a typed fragment case-insensitively", async () => {
    database.member.findMany.mockResolvedValue([{ id: memberA, fullName: "Shantanu", admissionId: "ZF-2" }]);
    const response = await GET(new Request("http://localhost/api/admin/award-points?q=Sha"));
    expect((await response.json()).data).toEqual([{ id: memberA, fullName: "Shantanu", admissionId: "ZF-2" }]);
    expect(database.member.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { OR: expect.arrayContaining([{ fullName: { contains: "Sha", mode: "insensitive" } }]) },
    }));
  });

  it.each(["expired", "upcoming", "disabled", "noncanonical"])("rejects %s attendance before awarding the batch", async kind => {
    const member = activeMember(memberB, "ZF-2");
    if (kind === "expired") member.memberships[0].endDate = new Date("2026-11-07Z");
    if (kind === "upcoming") member.memberships[0].startDate = new Date("2026-11-09Z");
    if (kind === "disabled") member.qrCodeActive = false;
    const second = kind === "noncanonical" ? { ...member, managementMemberId: "linked", memberships: member.memberships.map(period => ({ ...period, managementMembershipId: null })) } : member;
    database.member.findMany.mockResolvedValue([activeMember(memberA, "ZF-1"), second]);
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect((await response.json()).error.message).toContain("ZF-2");
    expect(database.pointTransaction.createMany).not.toHaveBeenCalled();
  });

  it("uses the Indian date after midnight IST", async () => {
    vi.setSystemTime(new Date("2026-11-08T19:00:00Z"));
    await POST(request());
    const row = database.pointTransaction.createMany.mock.calls[0][0].data[0];
    expect(row.referenceKey).toBe(`daily:${memberA}:2026-11-09`);
    expect(row.businessDate.toISOString()).toBe("2026-11-09T00:00:00.000Z");
  });

  it("rejects an empty search", async () => {
    expect((await GET(new Request("http://localhost/api/admin/award-points?q="))).status).toBe(400);
    expect(database.member.findMany).not.toHaveBeenCalled();
  });
});
