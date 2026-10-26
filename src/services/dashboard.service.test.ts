import { beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/database/prisma";
import { getDashboard } from "./dashboard.service";

vi.mock("@/lib/database/prisma", () => ({ prisma: { member: { findUnique: vi.fn() } } }));
vi.mock("@/services/fitness-target.service", () => ({ getFitnessTarget: vi.fn(async () => ({ target: null, rewardClaimed: false })) }));
vi.mock("@/services/points.service", () => ({ getDailyVisitStreakStatus: vi.fn(async () => ({ currentStreak: 0, streakExpiresAt: null, streakExpiresSoon: false })) }));

beforeEach(() => { vi.clearAllMocks(); });

describe("profile completion", () => {
  it.each([null, "", "Previous knee injury"])("treats medical history %s as optional", async (medicalHistory) => {
    vi.mocked(prisma.member.findUnique).mockResolvedValue({
      id: "member", fullName: "Member Name", admissionId: "ZF-101", mobileNumber: "9876500001",
      gender: "Female", birthDate: new Date("1990-01-01"), address: "Saved address", medicalHistory,
      memberships: [],
    } as unknown as Awaited<ReturnType<typeof prisma.member.findUnique>>);
    const dashboard = await getDashboard("member");
    expect(dashboard.member.profileCompletionPercentage).toBe(100);
    expect(dashboard.alerts.some(alert => alert.type === "PROFILE_INCOMPLETE")).toBe(false);
  });
});
