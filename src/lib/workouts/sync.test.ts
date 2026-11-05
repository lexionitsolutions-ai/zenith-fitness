import type { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { syncWorkoutCards } from "./sync";

describe("updated workout card sync", () => {
  it("archives old cards without deleting assignments or progress and never seeds videos", async () => {
    let nextId = 0;
    const record = vi.fn(async () => ({ id: `new-${++nextId}` }));
    const tx = {
      workoutPlan: {
        findMany: vi.fn(async () => [{ id: "old-plan" }]),
        updateMany: vi.fn(async () => ({ count: 6 })),
        upsert: vi.fn(record),
        deleteMany: vi.fn(),
      },
      memberWorkoutAssignment: { updateMany: vi.fn(async () => ({ count: 100 })), deleteMany: vi.fn() },
      memberExerciseProgress: { deleteMany: vi.fn(async () => ({ count: 0 })) },
      gymStation: { upsert: vi.fn(record) },
      exercise: { upsert: vi.fn(record), updateMany: vi.fn(async () => ({ count: 0 })) },
      workoutPlanDay: { upsert: vi.fn(record) },
      workoutPlanExercise: { upsert: vi.fn(record), deleteMany: vi.fn(async () => ({ count: 0 })) },
    };
    const result = await syncWorkoutCards(tx as unknown as Prisma.TransactionClient);
    expect(result).toMatchObject({ cards: 3, days: 28, exercises: 61, archivedCards: 1, retiredAssignments: 100 });
    expect(tx.workoutPlan.deleteMany).not.toHaveBeenCalled();
    expect(tx.memberWorkoutAssignment.deleteMany).not.toHaveBeenCalled();
    expect(tx.workoutPlan.updateMany).toHaveBeenCalledWith({ where: { id: { in: ["old-plan"] } }, data: { active: false } });
    expect(tx.memberWorkoutAssignment.updateMany).toHaveBeenCalledWith({
      where: { workoutPlanId: { in: ["old-plan"] }, status: "ACTIVE" },
      data: { status: "REPLACED", completedAt: expect.any(Date) },
    });
    // Cleanup is restricted to surplus rows on the new days, never old member history.
    for (const [call] of tx.memberExerciseProgress.deleteMany.mock.calls as unknown as [{ where: { workoutPlanExercise: { workoutPlanDayId: string; sortOrder: { gt: number } } } }][]) {
      expect(call.where.workoutPlanExercise.workoutPlanDayId).toMatch(/^new-/);
      expect(call.where.workoutPlanExercise.sortOrder.gt).toBeGreaterThanOrEqual(0);
    }
    for (const [call] of tx.exercise.upsert.mock.calls as unknown as [{ create: Record<string, unknown>; update: Record<string, unknown> }][]) {
      expect(call.create).toMatchObject({ videoUrl: null, youtubeVideoId: null, thumbnailUrl: null });
      expect(call.create.slug).toMatch(/^zenith-cards-/);
      // Owner-added video fields survive later syncs.
      expect(call.update).not.toHaveProperty("videoUrl");
      expect(call.update).not.toHaveProperty("youtubeVideoId");
    }
  });
});
