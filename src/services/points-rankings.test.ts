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
    const rankings = members.map((member, index) => ({ memberId: member.id, _sum: { points: 800 - index * 5 }, _count: { id: 80 - index } }));
    database.member.findUnique.mockResolvedValue({ ...members[64], qrToken: "preview" });
    database.member.findMany.mockResolvedValue(members);
    database.$queryRaw.mockResolvedValue(members.map((member, index) => ({ memberId: member.id, fullName: member.fullName, admissionId: member.admissionId, totalPoints: BigInt(800 - index * 5), monthlyPoints: BigInt(800 - index * 5), monthlyVisits: BigInt(80 - index) })));
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
      { memberId: "a", fullName: "Alpha", admissionId: "ZF-1", totalPoints: 100n, monthlyPoints: 10n, monthlyVisits: 1n },
      { memberId: "b", fullName: "Beta", admissionId: "ZF-2", totalPoints: 80n, monthlyPoints: 10n, monthlyVisits: 2n },
      { memberId: "c", fullName: "Gamma", admissionId: "ZF-3", totalPoints: 0n, monthlyPoints: 0n, monthlyVisits: 0n },
    ]);
    const result = await getMemberPoints("b");
    expect(result.pointsBalance).toBe(80);
    expect(result.currentMemberRank).toBe(2);
    expect(result.monthlyAchievers.map(row => row.name)).toEqual(["Beta", "Alpha"]);
    expect(result.monthlyAchievers[0]).toMatchObject({ rank: 1, points: 10, visits: 2, isCurrentMember: true });
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

});
