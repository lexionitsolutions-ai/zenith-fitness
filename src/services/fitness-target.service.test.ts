import { beforeEach, describe, expect, it, vi } from "vitest";
import { addBmiAssessment, getFitnessTarget } from "./fitness-target.service";

const database = vi.hoisted(() => ({
  memberFitnessTarget: { findFirst: vi.fn(), update: vi.fn() },
  bmiAssessment: { create: vi.fn() },
  pointTransaction: { findUnique: vi.fn(async () => ({ id: "reward" })) },
}));
vi.mock("@/lib/database/prisma", () => ({ prisma: database }));

function savedTarget(status = "ACTIVE") {
  const baseline = { id: "baseline", assessmentNumber: 1, assessmentDate: new Date("2026-09-09"), weightKg: 75, skeletalMuscleMassKg: 32, fatMassKg: 17, bodyFatPercentage: 23 };
  const followup = { ...baseline, id: "followup", assessmentNumber: 2, assessmentDate: new Date("2026-10-24"), weightKg: 72.5, skeletalMuscleMassKg: 33, fatMassKg: 14, bodyFatPercentage: 19 };
  return {
    id: "saved-target", goalType: "MUSCLE_GAIN", status, baselineBmiAssessment: baseline,
    baselineWeightKg: 75, baselineMuscleMassKg: 32, targetWeightKg: null, targetMuscleMassKg: 33,
    startDate: new Date("2026-09-09"), targetEndDate: new Date("2026-11-01"), lastReminderShownAt: null,
    bmiAssessments: status === "COMPLETED" ? [followup, baseline] : [baseline],
  };
}

beforeEach(() => { vi.clearAllMocks(); });

describe("BMI target history", () => {
  it("shows the completed target and both BMI reports after the 45-day follow-up", async () => {
    database.memberFitnessTarget.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(savedTarget("COMPLETED"));
    const result = await getFitnessTarget("member");
    expect(result.target).toMatchObject({ id: "saved-target", status: "COMPLETED", bmiDue: false, progress: { visualPercentage: 100 } });
    expect(result.target?.history.map(report => report.assessmentNumber)).toEqual([1, 2]);
    expect(result.target?.baseline.skeletalMuscleMassKg).toBe(32);
    expect(result.target?.latest.skeletalMuscleMassKg).toBe(33);
    expect(database.memberFitnessTarget.findFirst).toHaveBeenLastCalledWith(expect.objectContaining({ where: { memberId: "member", status: "COMPLETED" }, orderBy: { createdAt: "desc" } }));
  });

  it("prefers an active target over an older completed goal", async () => {
    database.memberFitnessTarget.findFirst.mockResolvedValue(savedTarget());
    const result = await getFitnessTarget("member");
    expect(result.target?.status).toBe("ACTIVE");
    expect(database.memberFitnessTarget.findFirst).toHaveBeenCalledTimes(1);
  });

  it("returns an empty state only when neither an active nor completed target exists", async () => {
    database.memberFitnessTarget.findFirst.mockResolvedValue(null);
    expect(await getFitnessTarget("member")).toEqual({ target: null, rewardClaimed: true });
    expect(database.memberFitnessTarget.findFirst).toHaveBeenCalledTimes(2);
  });

  it("returns the saved follow-up and baseline when the new report completes a target", async () => {
    const target = savedTarget();
    database.memberFitnessTarget.findFirst.mockImplementation(async ({ where }: { where: { status: string } }) => target.status === where.status ? target : null);
    database.bmiAssessment.create.mockImplementation(async ({ data }) => {
      target.bmiAssessments.unshift({ ...data, id: "followup" });
    });
    database.memberFitnessTarget.update.mockImplementation(async ({ data }) => { target.status = data.status; });
    const result = await addBmiAssessment("member", {
      assessmentDate: "2026-10-24", weightKg: 72.5, skeletalMuscleMassKg: 33, fatMassKg: 14, bodyFatPercentage: 19,
    });
    expect(database.bmiAssessment.create).toHaveBeenCalledWith({ data: expect.objectContaining({ fitnessTargetId: "saved-target", assessmentNumber: 2 }) });
    expect(result.target?.status).toBe("COMPLETED");
    expect(result.target?.history).toHaveLength(2);
    expect(result.target?.baseline.id).toBe("baseline");
    expect(result.target?.bmiDue).toBe(false);
  });
});
