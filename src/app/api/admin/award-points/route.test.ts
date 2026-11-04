import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";

const database = vi.hoisted(() => ({
  member: { count: vi.fn(), findMany: vi.fn() },
  pointTransaction: { createMany: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("@/lib/auth/session", () => ({ getSession: vi.fn() }));
vi.mock("@/lib/database/prisma", () => ({ prisma: database }));

const memberA = "00000000-0000-4000-8000-000000000001";
const memberB = "00000000-0000-4000-8000-000000000002";
const batchId = "00000000-0000-4000-8000-000000000003";
const payload = { batchId, memberIds: [memberA, memberB], points: 50, description: "Group challenge completed" };
const request = (body = payload) => new Request("http://localhost/api/admin/award-points", { method: "POST", body: JSON.stringify(body) });

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(getSession).mockResolvedValue({ userId: "admin", memberId: null, role: "ADMIN" });
  database.member.count.mockResolvedValue(2);
  database.member.findMany.mockResolvedValue([{ id: memberA, fullName: "Alpha", admissionId: "ZF-2" }]);
  database.pointTransaction.createMany.mockResolvedValue({ count: 2 });
  database.$transaction.mockImplementation(async callback => callback(database));
});

describe("admin bulk point awards", () => {
  it.each(["STAFF", "MEMBER", null] as const)("rejects %s sessions before searching or awarding", async role => {
    vi.mocked(getSession).mockResolvedValue(role ? { userId: "other", memberId: null, role } : null);
    expect((await POST(request())).status).toBe(403);
    expect((await GET(new Request("http://localhost/api/admin/award-points?q=Alpha"))).status).toBe(403);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(database.member.findMany).not.toHaveBeenCalled();
  });

  it("awards the same points to all selected members with the admin and reason recorded", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect((await response.json()).data).toEqual({ awardedCount: 2, selectedCount: 2, points: 50 });
    expect(database.$transaction).toHaveBeenCalledTimes(1);
    const { data, skipDuplicates } = database.pointTransaction.createMany.mock.calls[0][0];
    expect(skipDuplicates).toBe(true);
    expect(data.map((row: { memberId: string }) => row.memberId)).toEqual([memberA, memberB]);
    for (const row of data) expect(row).toMatchObject({ points: 50, transactionType: "ADMIN_ADJUSTMENT", description: payload.description, awardedByUserId: "admin", businessDate: expect.any(Date) });
    expect(data[0].referenceKey).not.toBe(data[1].referenceKey);
  });

  it("deduplicates selected members", async () => {
    database.member.count.mockResolvedValue(1);
    await POST(request({ ...payload, memberIds: [memberA, memberA] }));
    expect(database.pointTransaction.createMany.mock.calls[0][0].data).toHaveLength(1);
  });

  it("uses the same unique keys for a retry so it cannot award a member twice", async () => {
    const saved = new Set<string>();
    database.pointTransaction.createMany.mockImplementation(async ({ data }) => {
      let count = 0;
      for (const row of data) if (!saved.has(row.referenceKey)) { saved.add(row.referenceKey); count++; }
      return { count };
    });
    expect((await (await POST(request())).json()).data.awardedCount).toBe(2);
    expect((await (await POST(request())).json()).data.awardedCount).toBe(0);
    expect(saved.size).toBe(2);
  });

  it("rejects a batch containing an unknown member before writing points", async () => {
    database.member.count.mockResolvedValue(1);
    expect((await POST(request())).status).toBe(404);
    expect(database.pointTransaction.createMany).not.toHaveBeenCalled();
  });

  it.each([
    { points: 0 }, { points: -5 }, { points: 1.5 }, { points: 10001 },
    { memberIds: [] }, { memberIds: ["bad-id"] }, { memberIds: Array(201).fill(memberA) },
    { description: "  " }, { batchId: "bad-id" },
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
    expect((await response.json()).data[0].admissionId).toBe("ZF-2");
    expect(database.member.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { OR: expect.arrayContaining([{ admissionId: "ZF-2" }]) }, take: 30,
    }));
  });

  it("rejects an empty search", async () => {
    expect((await GET(new Request("http://localhost/api/admin/award-points?q="))).status).toBe(400);
    expect(database.member.findMany).not.toHaveBeenCalled();
  });
});
