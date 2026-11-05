import { beforeEach, describe, expect, it, vi } from "vitest";
import { selectWorkoutGoal } from "./workout.service";

const database = vi.hoisted(() => ({
  workoutPlan: { findFirst: vi.fn() },
  memberWorkoutAssignment: { findFirst: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("@/lib/database/prisma", () => ({ prisma: database }));

describe("following an updated workout card", () => {
  const input = { fitnessGoal: "GENERAL_FITNESS", workoutPlanSlug: "zenith-level-1-foundation" };
  beforeEach(() => {
    vi.clearAllMocks();
    database.workoutPlan.findFirst.mockResolvedValue({ id: "new-plan" });
    database.memberWorkoutAssignment.findFirst.mockResolvedValue(null);
    database.memberWorkoutAssignment.create.mockResolvedValue({ id: "new-assignment" });
    database.$transaction.mockImplementation((callback) => callback(database));
  });

  it("replaces an active archived card so it cannot silently block selection", async () => {
    database.memberWorkoutAssignment.findFirst.mockResolvedValue({ id: "old-assignment", workoutPlanId: "old-plan",
      workoutPlan: { slug: "zenith-beginner", active: false } });
    await expect(selectWorkoutGoal("member", input)).resolves.toEqual({ id: "new-assignment" });
    expect(database.memberWorkoutAssignment.updateMany).toHaveBeenCalledWith({
      where: { memberId: "member", status: "ACTIVE" }, data: { status: "REPLACED", completedAt: expect.any(Date) },
    });
    expect(database.memberWorkoutAssignment.create).toHaveBeenCalledWith({ data: {
      memberId: "member", workoutPlanId: "new-plan", fitnessGoal: "GENERAL_FITNESS", startedAt: expect.any(Date),
    } });
  });

  it("reuses the same assignment when a successful selection is retried", async () => {
    const assignment = { id: "existing", workoutPlanId: "new-plan", workoutPlan: { slug: input.workoutPlanSlug, active: true } };
    database.memberWorkoutAssignment.findFirst.mockResolvedValue(assignment);
    await expect(selectWorkoutGoal("member", input)).resolves.toEqual(assignment);
    expect(database.memberWorkoutAssignment.create).not.toHaveBeenCalled();
    expect(database.memberWorkoutAssignment.updateMany).not.toHaveBeenCalled();
  });

  it("requires explicit replacement when a different current level is active", async () => {
    database.memberWorkoutAssignment.findFirst.mockResolvedValue({ workoutPlanId: "other-plan",
      workoutPlan: { slug: "zenith-level-2-strength-builder", active: true } });
    await expect(selectWorkoutGoal("member", input)).rejects.toMatchObject({ code: "WORKOUT_EXISTS", status: 409 });
    expect(database.memberWorkoutAssignment.create).not.toHaveBeenCalled();
  });

  it("rejects an old card sent by a stale client", async () => {
    await expect(selectWorkoutGoal("member", { ...input, workoutPlanSlug: "zenith-beginner" })).rejects.toMatchObject({ code: "WORKOUT_PLAN_MISSING" });
    expect(database.$transaction).not.toHaveBeenCalled();
  });
});
