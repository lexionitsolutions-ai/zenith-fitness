import { beforeEach, describe, expect, it, vi } from "vitest";
import { canManageFunctionalBatches, createFunctionalBatch, createFunctionalVideo, functionalBatchSchema, getFunctionalWorkouts } from "./functional-workout.service";

const database = vi.hoisted(() => ({
  functionalBatch: { create: vi.fn(), findMany: vi.fn() },
  functionalExercise: { count: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock("@/lib/database/prisma", () => ({ prisma: database }));
const exerciseId = "5eaf8ef0-a9f8-49de-8ffd-f508ba070cf1";
const otherExerciseId = "5eaf8ef0-a9f8-49de-8ffd-f508ba070cf2";
const input = { title: "Morning batch", rounds: 3, exercises: [
  { exerciseId, workSeconds: 40, restSeconds: 20, repetitions: 12, repsPerSecond: 1.5 },
  { exerciseId: otherExerciseId, workSeconds: 30, restSeconds: 0 },
] };

describe("functional batch permissions and persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    database.$transaction.mockImplementation((callback) => callback(database));
    database.functionalExercise.count.mockResolvedValue(2);
    database.functionalBatch.create.mockResolvedValue({ id: "new-batch" });
  });
  it("lets only staff/trainers and admins manage batches", () => {
    expect(canManageFunctionalBatches("MEMBER")).toBe(false);
    expect(canManageFunctionalBatches("STAFF")).toBe(true);
    expect(canManageFunctionalBatches("ADMIN")).toBe(true);
  });
  it("rejects member writes even when creation is called directly", async () => {
    await expect(createFunctionalBatch({ userId: "member", role: "MEMBER" }, input)).rejects.toMatchObject({ status: 403 });
    expect(database.$transaction).not.toHaveBeenCalled();
    expect(database.functionalBatch.create).not.toHaveBeenCalled();
  });
  it.each(["STAFF", "ADMIN"] as const)("saves a %s batch and its exact exercise order atomically", async (role) => {
    await expect(createFunctionalBatch({ userId: "creator", role }, input)).resolves.toEqual({ id: "new-batch" });
    expect(database.functionalBatch.create).toHaveBeenCalledWith({ data: {
      title: "Morning batch", description: null, rounds: 3, scheduledAt: null, createdById: "creator",
      exercises: { create: [
        { exerciseId, sortOrder: 1, workSeconds: 40, restSeconds: 20, repetitions: 12, repsPerSecond: 1.5 },
        { exerciseId: otherExerciseId, sortOrder: 2, workSeconds: 30, restSeconds: 0, repetitions: null, repsPerSecond: 0.5 },
      ] },
    }, select: { id: true } });
  });
  it("rejects missing or inactive exercise references before saving", async () => {
    database.functionalExercise.count.mockResolvedValue(1);
    await expect(createFunctionalBatch({ userId: "trainer", role: "STAFF" }, input)).rejects.toMatchObject({ code: "EXERCISE_UNAVAILABLE" });
    expect(database.functionalBatch.create).not.toHaveBeenCalled();
  });
  it("rejects empty batches and invalid timing", () => {
    expect(functionalBatchSchema.safeParse({ ...input, exercises: [] }).success).toBe(false);
    expect(functionalBatchSchema.safeParse({ ...input, rounds: 0 }).success).toBe(false);
    expect(functionalBatchSchema.safeParse({ ...input, exercises: [{ exerciseId, workSeconds: -1 }] }).success).toBe(false);
    expect(functionalBatchSchema.safeParse({ ...input, exercises: [{ exerciseId, restSeconds: 301 }] }).success).toBe(false);
    expect(functionalBatchSchema.safeParse({ ...input, exercises: [{ exerciseId, repsPerSecond: 0 }] }).success).toBe(false);
    expect(functionalBatchSchema.safeParse({ ...input, exercises: [{ exerciseId, repsPerSecond: 6 }] }).success).toBe(false);
  });
  it("loads saved active batches and the playable exercise library", async () => {
    database.functionalBatch.findMany.mockResolvedValue([]);
    database.functionalExercise.findMany.mockResolvedValue([]);
    await expect(getFunctionalWorkouts()).resolves.toEqual({ batches: [], exercises: [] });
    expect(database.functionalBatch.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { active: true },
      include: expect.objectContaining({ exercises: { orderBy: { sortOrder: "asc" }, include: { exercise: true } } }) }));
  });
  it("denies member video creation", async () => {
    await expect(createFunctionalVideo({ userId: "member", role: "MEMBER" }, {})).rejects.toMatchObject({ status: 403 });
    expect(database.functionalExercise.create).not.toHaveBeenCalled();
  });
  it("stores a trainer's own YouTube clip with portrait framing", async () => {
    database.functionalExercise.create.mockResolvedValue({ id: "saved-video" });
    await expect(createFunctionalVideo({ userId: "trainer", role: "STAFF" }, {
      name: "Trainer exercise", videoUrl: "https://youtu.be/LBp7ez0VzaI?feature=shared", videoStartSeconds: 35, videoEndSeconds: 45, videoLayout: "CENTER_CROP",
    })).resolves.toEqual({ id: "saved-video" });
    expect(database.functionalExercise.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      name: "Trainer exercise", youtubeVideoId: "LBp7ez0VzaI", videoStartSeconds: 35, videoEndSeconds: 45, videoLayout: "CENTER_CROP",
    }), select: { id: true } });
  });
  it("rejects reversed clip ranges and arbitrary embed code", async () => {
    const actor = { userId: "admin", role: "ADMIN" as const };
    await expect(createFunctionalVideo(actor, { name: "Bad clip", videoUrl: "https://youtu.be/LBp7ez0VzaI", videoStartSeconds: 20, videoEndSeconds: 10 })).rejects.toBeDefined();
    await expect(createFunctionalVideo(actor, { name: "Bad video", videoUrl: "javascript:alert(1)" })).rejects.toMatchObject({ code: "INVALID_VIDEO" });
    expect(database.functionalExercise.create).not.toHaveBeenCalled();
  });
});
