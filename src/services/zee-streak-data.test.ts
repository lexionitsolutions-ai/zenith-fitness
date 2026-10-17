import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/database/prisma";
import { getDashboard } from "./dashboard.service";
import { getMemberPoints } from "./points.service";

vi.mock("@/lib/database/prisma", () => ({ prisma: {
  member: { findUnique: vi.fn(), findMany: vi.fn(async () => []) },
  pointTransaction: { findMany: vi.fn(async () => []), aggregate: vi.fn(async () => ({ _sum: { points: 135 } })), groupBy: vi.fn(async () => []) },
  memberTarget: { findMany: vi.fn(async () => []) },
} }));
vi.mock("@/services/fitness-target.service", () => ({ getFitnessTarget: vi.fn(async () => ({ target: null, rewardClaimed: true })) }));

beforeEach(() => {
  vi.mocked(prisma.member.findUnique).mockResolvedValue({
    id: "member", fullName: "Zee Preview", admissionId: "ZF-PREVIEW", qrToken: "preview",
    memberships: [], gender: null, birthDate: null, address: null, medicalHistory: null,
  } as unknown as Awaited<ReturnType<typeof prisma.member.findUnique>>);
});

describe("shared Zee date in member service results", () => {
  it.each([
    ["2026-10-16T18:29:59.999Z", "2026-10-16"],
    ["2026-10-16T18:30:00.000Z", "2026-10-17"],
  ])("uses the same India day in dashboard and points at %s", async (instant, businessDate) => {
    const dashboard = await getDashboard("member", new Date(instant));
    const points = await getMemberPoints("member", new Date(instant));
    expect(dashboard.streakBusinessDate).toBe(businessDate);
    expect(points.streakBusinessDate).toBe(businessDate);
    expect(dashboard.currentStreak).toBe(points.currentStreak);
    expect(points.pointsBalance).toBe(135);
  });
});
