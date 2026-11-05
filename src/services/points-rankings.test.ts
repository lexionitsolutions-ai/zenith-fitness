import { describe, expect, it, vi } from "vitest";
import { getMemberPoints } from "./points.service";

const database = vi.hoisted(() => ({
  member: { findUnique: vi.fn(), findMany: vi.fn() },
  $queryRaw: vi.fn(),
  pointTransaction: { findMany: vi.fn(async () => []), aggregate: vi.fn(async () => ({ _sum: { points: 80 } })), groupBy: vi.fn() },
  memberTarget: { findMany: vi.fn(async () => []) },
}));
vi.mock("@/lib/database/prisma", () => ({ prisma: database }));

describe("complete rewards rankings", () => {
  it("includes members beyond rank 50 and monthly rank 10 with their correct rank", async () => {
    const members = Array.from({ length: 80 }, (_, index) => ({ id: `member-${index + 1}`, fullName: `Member${index + 1} Example`, admissionId: `ZF-${index + 1}` }));
    database.member.findUnique.mockResolvedValue({ ...members[64], qrToken: "preview" });
    database.member.findMany.mockResolvedValue(members);
    database.$queryRaw.mockResolvedValue(members.map((member, index) => ({ memberId: member.id, fullName: member.fullName, admissionId: member.admissionId, totalPoints: BigInt(800 - index * 5), monthlyPoints: BigInt(800 - index * 5), currentStreak: BigInt(80 - index), monthlyVisits: BigInt(80 - index) })));
    const result = await getMemberPoints("member-65", new Date("2026-10-26T10:00:00Z"));
    expect(result.leaderboard).toHaveLength(80);
    expect(result.monthlyAchievers).toHaveLength(80);
    expect(result.currentMemberRank).toBe(65);
    expect(result.leaderboard[64]).toMatchObject({ rank: 65, isCurrentMember: true });
    expect(result.monthlyAchievers[79]).toMatchObject({ rank: 80, visits: 1 });
    expect(result.pointsBalance).toBe(480);
    expect(database.$queryRaw).toHaveBeenCalledTimes(1);
  });
  it("orders monthly ties by visits and excludes members without monthly visits", async () => {
    database.member.findUnique.mockResolvedValue({ qrToken: "preview", fullName: "Beta", admissionId: "ZF-2" });
    database.$queryRaw.mockResolvedValue([
      { memberId: "a", fullName: "Alpha", admissionId: "ZF-1", currentStreak: 1n, totalPoints: 100n, monthlyPoints: 10n, monthlyVisits: 1n },
      { memberId: "b", fullName: "Beta", admissionId: "ZF-2", currentStreak: 4n, totalPoints: 80n, monthlyPoints: 10n, monthlyVisits: 2n },
      { memberId: "c", fullName: "Gamma", admissionId: "ZF-3", currentStreak: 0n, totalPoints: 0n, monthlyPoints: 0n, monthlyVisits: 0n },
    ]);
    const result = await getMemberPoints("b");
    expect(result.pointsBalance).toBe(80);
    expect(result.currentMemberRank).toBe(1);
    expect(result.leaderboard.map(row => row.name)).toEqual(["Beta", "Alpha", "Gamma"]);
    expect(result.leaderboard[0]).toMatchObject({ currentStreak: 4, points: 80, isCurrentMember: true });
    expect(result.monthlyAchievers.map(row => row.name)).toEqual(["Beta", "Alpha"]);
    expect(result.monthlyAchievers[0]).toMatchObject({ rank: 1, points: 10, visits: 2, isCurrentMember: true });
    expect(result.leaderboard[0].admissionId).toBe("ZF-2");
    expect(result.monthlyAchievers[0].admissionId).toBe("ZF-2");
  });
  it("preserves an unranked zero balance for a member without transactions", async () => {
    database.member.findUnique.mockResolvedValue({ qrToken: "preview", fullName: "Member", admissionId: "ZF-1" });
    database.$queryRaw.mockResolvedValue([]);
    const result = await getMemberPoints("new-member");
    expect(result.pointsBalance).toBe(0);
    expect(result.currentMemberRank).toBeNull();
    expect(result.leaderboard).toEqual([]);
    expect(result.monthlyAchievers).toEqual([]);
  });
  it("keeps tied streak ranks stable without using points as a tiebreaker", async () => {
    database.member.findUnique.mockResolvedValue({ qrToken: "preview", fullName: "Alpha", admissionId: "ZF-1" });
    database.$queryRaw.mockResolvedValue([
      { memberId: "b", fullName: "Beta", admissionId: "ZF-2", currentStreak: 2n, totalPoints: 900n, monthlyPoints: 0n, monthlyVisits: 0n },
      { memberId: "a", fullName: "Alpha", admissionId: "ZF-1", currentStreak: 2n, totalPoints: 0n, monthlyPoints: 0n, monthlyVisits: 0n },
      { memberId: "c", fullName: "Gamma", admissionId: "ZF-3", currentStreak: 0n, totalPoints: 1000n, monthlyPoints: 0n, monthlyVisits: 0n },
    ]);
    const result = await getMemberPoints("a");
    expect(result.leaderboard.map(row => row.name)).toEqual(["Alpha", "Beta", "Gamma"]);
    expect(result.currentMemberRank).toBe(1);
    expect(result.pointsBalance).toBe(0);
  });
  it("excludes award-only earners and ranks monthly daily points independently of total balances", async () => {
    database.member.findUnique.mockResolvedValue({ qrToken: "preview", fullName: "Alpha", admissionId: "ZF-1" });
    database.$queryRaw.mockResolvedValue([
      { memberId: "a", fullName: "Alpha", admissionId: "ZF-1", currentStreak: 0n, totalPoints: 400n, monthlyPoints: 0n, monthlyVisits: 0n },
      { memberId: "b", fullName: "Beta", admissionId: "ZF-2", currentStreak: 3n, totalPoints: 500n, monthlyPoints: 15n, monthlyVisits: 3n },
      { memberId: "c", fullName: "Gamma", admissionId: "ZF-3", currentStreak: 1n, totalPoints: 1000n, monthlyPoints: 5n, monthlyVisits: 1n },
    ]);
    const result = await getMemberPoints("a");
    expect(result.monthlyAchievers.map(row => row.name)).toEqual(["Beta", "Gamma"]);
    expect(result.monthlyAchievers[0]).toMatchObject({ points: 15, visits: 3, admissionId: "ZF-2" });
    expect(result.pointsBalance).toBe(400);
    expect(result.leaderboard[0].name).toBe("Beta");
    const query = database.$queryRaw.mock.calls.at(-1)![0].join("?");
    expect(query).toMatch(/SUM\(p\.points\) FILTER \(WHERE p\."transactionType" = 'DAILY_VISIT' AND p\.points > 0\s+AND p\."businessDate" >= .*?::date AND p\."businessDate" < .*?::date\), 0\)::bigint AS "monthlyPoints"/);
  });

});
