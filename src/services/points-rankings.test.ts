import { describe, expect, it, vi } from "vitest";
import { getMemberPoints } from "./points.service";

const database = vi.hoisted(() => ({
  member: { findUnique: vi.fn(), findMany: vi.fn() },
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
    database.pointTransaction.groupBy.mockResolvedValueOnce(rankings).mockResolvedValueOnce(rankings);
    const result = await getMemberPoints("member-65", new Date("2026-10-26T10:00:00Z"));
    expect(result.leaderboard).toHaveLength(80);
    expect(result.monthlyAchievers).toHaveLength(80);
    expect(result.currentMemberRank).toBe(65);
    expect(result.leaderboard[64]).toMatchObject({ rank: 65, isCurrentMember: true });
    expect(result.monthlyAchievers[79]).toMatchObject({ rank: 80, visits: 1 });
    for (const [query] of database.pointTransaction.groupBy.mock.calls) expect(query).not.toHaveProperty("take");
  });
});
