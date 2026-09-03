import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/database/prisma";
import { AppError } from "@/lib/errors";
import { indiaBusinessDate } from "@/lib/utils/point-rules";
import {
  BMI_VALIDATION_RANGES,
  calculateMuscleGainProgress,
  calculateNextBmiDate,
  calculateWeightLossProgress,
  formatDateOnly,
  parseDateOnly,
} from "@/lib/utils/fitness-targets";

const measurement = (key: keyof typeof BMI_VALIDATION_RANGES) => {
  const range = BMI_VALIDATION_RANGES[key];
  return z.coerce.number().finite().min(range.min, `${range.label} must be at least ${range.min}.`).max(range.max, `${range.label} must be ${range.max} or less.`);
};

const bmiInputSchema = z.object({
  assessmentDate: z.string(),
  weightKg: measurement("weightKg"),
  skeletalMuscleMassKg: measurement("skeletalMuscleMassKg"),
  fatMassKg: measurement("fatMassKg"),
  bodyFatPercentage: measurement("bodyFatPercentage"),
});

export const createFitnessTargetSchema = z.object({
  bmi: bmiInputSchema,
  goalType: z.enum(["WEIGHT_LOSS", "MUSCLE_GAIN"]),
  targetWeightKg: z.coerce.number().finite().optional(),
  targetMuscleMassKg: z.coerce.number().finite().optional(),
  startDate: z.string(),
  targetEndDate: z.string(),
});

export const addBmiAssessmentSchema = bmiInputSchema;

export const updateBmiAssessmentSchema = bmiInputSchema.extend({
  assessmentId: z.string().uuid(),
});

export const updateFitnessTargetSchema = z.object({
  targetWeightKg: z.coerce.number().finite().optional(),
  targetMuscleMassKg: z.coerce.number().finite().optional(),
  targetEndDate: z.string().optional(),
});

function assertDate(value: string, field: string) {
  const date = parseDateOnly(value);
  if (!date) throw new AppError("INVALID_DATE", `${field} must be a valid date.`);
  return date;
}

function assertNotFuture(date: Date, field: string, now = new Date()) {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (date > today) throw new AppError("FUTURE_DATE", `${field} cannot be in the future.`);
}

function serialize(target: Awaited<ReturnType<typeof findActiveTarget>>, rewardClaimed: boolean) {
  if (!target) return { target: null, rewardClaimed };
  const latest = target.bmiAssessments[0];
  const baseline = target.baselineBmiAssessment ?? target.bmiAssessments[target.bmiAssessments.length - 1];
  if (!latest || !baseline) return { target: null, rewardClaimed };
  const goalType = target.goalType;
  const progress =
    goalType === "WEIGHT_LOSS"
      ? calculateWeightLossProgress(Number(target.baselineWeightKg), Number(latest.weightKg), Number(target.targetWeightKg))
      : calculateMuscleGainProgress(Number(target.baselineMuscleMassKg), Number(latest.skeletalMuscleMassKg), Number(target.targetMuscleMassKg));
  const nextBmiDate = calculateNextBmiDate(latest.assessmentDate);
  const bmiDue = nextBmiDate <= new Date();
  return {
    target: {
      id: target.id,
      goalType,
      status: progress.reached ? "COMPLETED" : target.status,
      startDate: formatDateOnly(target.startDate),
      targetEndDate: formatDateOnly(target.targetEndDate),
      nextBmiDate: formatDateOnly(nextBmiDate),
      bmiDue,
      lastReminderShownAt: target.lastReminderShownAt?.toISOString() ?? null,
      baseline: toAssessment(baseline),
      latest: toAssessment(latest),
      targetWeightKg: target.targetWeightKg ? Number(target.targetWeightKg) : null,
      targetMuscleMassKg: target.targetMuscleMassKg ? Number(target.targetMuscleMassKg) : null,
      progress,
      history: [...target.bmiAssessments].reverse().map(toAssessment),
    },
    rewardClaimed,
  };
}

function toAssessment(assessment: NonNullable<Awaited<ReturnType<typeof findActiveTarget>>>["bmiAssessments"][number]) {
  return {
    id: assessment.id,
    assessmentNumber: assessment.assessmentNumber,
    assessmentDate: formatDateOnly(assessment.assessmentDate),
    weightKg: Number(assessment.weightKg),
    skeletalMuscleMassKg: Number(assessment.skeletalMuscleMassKg),
    fatMassKg: Number(assessment.fatMassKg),
    bodyFatPercentage: Number(assessment.bodyFatPercentage),
  };
}

async function findActiveTarget(memberId: string) {
  return prisma.memberFitnessTarget.findFirst({
    where: { memberId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    include: { baselineBmiAssessment: true, bmiAssessments: { orderBy: [{ assessmentDate: "desc" }, { createdAt: "desc" }] } },
  });
}

async function hasInitialTargetReward(memberId: string) {
  return !!(await prisma.pointTransaction.findUnique({ where: { referenceKey: `initial-bmi-target-setup:${memberId}` }, select: { id: true } }));
}

export async function getFitnessTarget(memberId: string) {
  return serialize(await findActiveTarget(memberId), await hasInitialTargetReward(memberId));
}

export async function createFitnessTarget(memberId: string, input: unknown) {
  const value = createFitnessTargetSchema.parse(input);
  const { assessmentDate: _initialAssessmentDate, ...bmiValues } = value.bmi;
  const assessmentDate = assertDate(value.bmi.assessmentDate, "BMI Test Date");
  const startDate = assertDate(value.startDate, "Start Date");
  const targetEndDate = assertDate(value.targetEndDate, "Target End Date");
  assertNotFuture(assessmentDate, "BMI Test Date");
  if (targetEndDate <= startDate) throw new AppError("INVALID_TARGET_DATES", "Target End Date must be after Start Date.");
  if (value.goalType === "WEIGHT_LOSS" && (!(value.targetWeightKg && value.targetWeightKg >= BMI_VALIDATION_RANGES.weightKg.min) || value.targetWeightKg >= value.bmi.weightKg)) throw new AppError("INVALID_TARGET_WEIGHT", "Target Weight must be lower than Current Weight.");
  if (value.goalType === "MUSCLE_GAIN" && (!(value.targetMuscleMassKg && value.targetMuscleMassKg <= BMI_VALIDATION_RANGES.skeletalMuscleMassKg.max) || value.targetMuscleMassKg <= value.bmi.skeletalMuscleMassKg)) throw new AppError("INVALID_TARGET_MUSCLE", "Target Muscle Mass must be higher than Skeletal Muscle Mass.");

  const result = await prisma.$transaction(async (tx) => {
    await tx.memberFitnessTarget.updateMany({ where: { memberId, status: "ACTIVE" }, data: { status: "CANCELLED" } });
    const target = await tx.memberFitnessTarget.create({
      data: {
        memberId,
        goalType: value.goalType,
        baselineWeightKg: value.bmi.weightKg,
        baselineMuscleMassKg: value.bmi.skeletalMuscleMassKg,
        targetWeightKg: value.goalType === "WEIGHT_LOSS" ? value.targetWeightKg : null,
        targetMuscleMassKg: value.goalType === "MUSCLE_GAIN" ? value.targetMuscleMassKg : null,
        startDate,
        targetEndDate,
      },
    });
    const assessment = await tx.bmiAssessment.create({ data: { memberId, fitnessTargetId: target.id, assessmentNumber: 1, assessmentDate, ...bmiValues } });
    const updated = await tx.memberFitnessTarget.update({ where: { id: target.id }, data: { baselineBmiAssessmentId: assessment.id } });
    let rewardAwarded = false;
    try {
      await tx.pointTransaction.create({
        data: { memberId, points: 50, transactionType: "INITIAL_BMI_TARGET_SETUP", referenceKey: `initial-bmi-target-setup:${memberId}`, description: "Completed Initial BMI & Target Setup", businessDate: indiaBusinessDate() },
      });
      rewardAwarded = true;
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) throw error;
    }
    return { targetId: updated.id, rewardAwarded };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  return { ...(await getFitnessTarget(memberId)), rewardAwarded: result.rewardAwarded, targetId: result.targetId };
}

export async function addBmiAssessment(memberId: string, input: unknown) {
  const value = addBmiAssessmentSchema.parse(input);
  const { assessmentDate: _assessmentDate, ...bmiValues } = value;
  const assessmentDate = assertDate(value.assessmentDate, "BMI Test Date");
  assertNotFuture(assessmentDate, "BMI Test Date");
  const active = await findActiveTarget(memberId);
  if (!active) throw new AppError("TARGET_NOT_FOUND", "Set a target before adding BMI progress.", 404);
  const nextNumber = Math.max(0, ...active.bmiAssessments.map((item) => item.assessmentNumber)) + 1;
  await prisma.bmiAssessment.create({ data: { memberId, fitnessTargetId: active.id, assessmentNumber: nextNumber, assessmentDate, ...bmiValues } });
  const refreshed = await findActiveTarget(memberId);
  const current = serialize(refreshed, await hasInitialTargetReward(memberId));
  if (current.target?.progress.reached) await prisma.memberFitnessTarget.update({ where: { id: active.id }, data: { status: "COMPLETED", completedAt: new Date() } });
  return getFitnessTarget(memberId);
}

export async function updateBmiAssessment(memberId: string, input: unknown) {
  const value = updateBmiAssessmentSchema.parse(input);
  const { assessmentId, assessmentDate: _assessmentDate, ...bmiValues } = value;
  const assessmentDate = assertDate(value.assessmentDate, "BMI Test Date");
  assertNotFuture(assessmentDate, "BMI Test Date");
  const assessment = await prisma.bmiAssessment.findFirst({
    where: { id: assessmentId, memberId },
    include: { fitnessTarget: true },
  });
  if (!assessment) throw new AppError("BMI_ASSESSMENT_NOT_FOUND", "BMI assessment was not found.", 404);
  await prisma.$transaction(async (tx) => {
    await tx.bmiAssessment.update({ where: { id: assessmentId }, data: { assessmentDate, ...bmiValues } });
    if (assessment.fitnessTarget.baselineBmiAssessmentId === assessmentId) {
      await tx.memberFitnessTarget.update({
        where: { id: assessment.fitnessTargetId },
        data: {
          baselineWeightKg: bmiValues.weightKg,
          baselineMuscleMassKg: bmiValues.skeletalMuscleMassKg,
        },
      });
    }
  });
  return getFitnessTarget(memberId);
}

export async function updateFitnessTarget(memberId: string, input: unknown) {
  const value = updateFitnessTargetSchema.parse(input);
  const active = await findActiveTarget(memberId);
  if (!active) throw new AppError("TARGET_NOT_FOUND", "No active target found.", 404);
  const targetEndDate = value.targetEndDate ? assertDate(value.targetEndDate, "Target End Date") : active.targetEndDate;
  if (targetEndDate <= active.startDate) throw new AppError("INVALID_TARGET_DATES", "Target End Date must be after Start Date.");
  if (active.goalType === "WEIGHT_LOSS" && value.targetWeightKg !== undefined && value.targetWeightKg >= Number(active.baselineWeightKg)) throw new AppError("INVALID_TARGET_WEIGHT", "Target Weight must be lower than Current Weight.");
  if (active.goalType === "MUSCLE_GAIN" && value.targetMuscleMassKg !== undefined && value.targetMuscleMassKg <= Number(active.baselineMuscleMassKg)) throw new AppError("INVALID_TARGET_MUSCLE", "Target Muscle Mass must be higher than Skeletal Muscle Mass.");
  await prisma.memberFitnessTarget.update({ where: { id: active.id }, data: { targetEndDate, targetWeightKg: value.targetWeightKg, targetMuscleMassKg: value.targetMuscleMassKg } });
  return getFitnessTarget(memberId);
}
