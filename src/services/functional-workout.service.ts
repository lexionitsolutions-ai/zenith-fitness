import { z } from "zod";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/database/prisma";
import { AppError } from "@/lib/errors";

export const functionalBatchSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional(),
  rounds: z.number().int().min(1).max(20).default(1),
  scheduledAt: z.string().datetime().nullable().optional(),
  exercises: z.array(z.object({
    exerciseId: z.string().uuid(),
    workSeconds: z.number().int().min(5).max(600).default(40),
    restSeconds: z.number().int().min(0).max(300).default(20),
    repetitions: z.number().int().min(1).max(1000).nullable().optional(),
  })).min(1).max(50),
});

export const canManageFunctionalBatches = (role: Role) => role === "ADMIN" || role === "STAFF";

const batchInclude = {
  createdBy: { select: { displayName: true, role: true } },
  exercises: { orderBy: { sortOrder: "asc" as const }, include: { exercise: true } },
};

export async function getFunctionalWorkouts() {
  const [batches, exercises] = await Promise.all([
    prisma.functionalBatch.findMany({ where: { active: true }, orderBy: { createdAt: "desc" }, include: batchInclude }),
    prisma.functionalExercise.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
  ]);
  return {
    batches: batches.map((batch) => ({ ...batch,
      createdAt: batch.createdAt.toISOString(), updatedAt: batch.updatedAt.toISOString(), scheduledAt: batch.scheduledAt?.toISOString() ?? null,
      exercises: batch.exercises.map((item) => ({ ...item, exercise: { ...item.exercise,
        createdAt: item.exercise.createdAt.toISOString(), updatedAt: item.exercise.updatedAt.toISOString() } })),
    })),
    exercises: exercises.map((exercise) => ({ ...exercise, createdAt: exercise.createdAt.toISOString(), updatedAt: exercise.updatedAt.toISOString() })),
  };
}

export async function createFunctionalBatch(actor: { userId: string; role: Role }, input: unknown) {
  if (!canManageFunctionalBatches(actor.role)) throw new AppError("FORBIDDEN", "Only trainers and admins can create functional batches.", 403);
  const data = functionalBatchSchema.parse(input);
  const exerciseIds = [...new Set(data.exercises.map((item) => item.exerciseId))];
  return prisma.$transaction(async (tx) => {
    const count = await tx.functionalExercise.count({ where: { id: { in: exerciseIds }, active: true } });
    if (count !== exerciseIds.length) throw new AppError("EXERCISE_UNAVAILABLE", "One or more exercises are unavailable. Refresh and choose again.", 400);
    return tx.functionalBatch.create({
      data: {
        title: data.title, description: data.description || null, rounds: data.rounds,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null, createdById: actor.userId,
        exercises: { create: data.exercises.map((item, index) => ({
          exerciseId: item.exerciseId, sortOrder: index + 1, workSeconds: item.workSeconds,
          restSeconds: item.restSeconds, repetitions: item.repetitions ?? null,
        })) },
      },
      select: { id: true },
    });
  });
}
