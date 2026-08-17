import { AssignmentStatus, ExerciseType, FitnessGoal, Prisma, Role, WorkoutLevel } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/database/prisma";
import { AppError } from "@/lib/errors";
import { GOAL_PLAN_SLUG, goalCards } from "@/lib/workouts/catalog";
import { parseYouTubeId, youtubeEmbedUrl, youtubeThumbnailUrl } from "@/lib/youtube";
import dataset from "@/data/workouts/exercises.normalized.json";

const idSchema = z.string().uuid();
export const goalSchema = z.object({ fitnessGoal: z.nativeEnum(FitnessGoal), workoutPlanSlug: z.string().min(1).max(80).optional() });
export const completeExerciseSchema = z.object({ workoutPlanExerciseId: idSchema, completed: z.boolean().default(true) });
export const adminAssignSchema = z.object({
  memberUserId: idSchema,
  workoutPlanId: idSchema,
  fitnessGoal: z.nativeEnum(FitnessGoal),
  replaceActive: z.boolean().default(true),
});
export const exerciseUpdateSchema = z.object({
  exerciseId: idSchema,
  videoUrl: z.string().url().nullable().optional(),
  videoStartSeconds: z.number().int().min(0).nullable().optional(),
  videoEndSeconds: z.number().int().min(1).nullable().optional(),
  instructions: z.string().max(2000).nullable().optional(),
  safetyInstructions: z.string().max(2000).nullable().optional(),
  active: z.boolean().optional(),
});
export const exerciseCreateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  exerciseType: z.nativeEnum(ExerciseType),
  equipmentType: z.string().trim().max(120).nullable().optional(),
  stationId: idSchema.nullable().optional(),
  videoUrl: z.string().url().nullable().optional(),
  videoStartSeconds: z.number().int().min(0).nullable().optional(),
  videoEndSeconds: z.number().int().min(1).nullable().optional(),
  instructions: z.string().max(2000).nullable().optional(),
  safetyInstructions: z.string().max(2000).nullable().optional(),
});
export const workoutCardExerciseCreateSchema = z.object({
  workoutPlanDayId: idSchema,
  exerciseId: idSchema,
  sectionName: z.string().trim().min(1).max(120),
  sets: z.number().int().min(1).max(20).nullable().optional(),
  reps: z.number().int().min(1).max(500).nullable().optional(),
  minimumReps: z.number().int().min(1).max(500).nullable().optional(),
  maximumReps: z.number().int().min(1).max(500).nullable().optional(),
  holdSeconds: z.number().int().min(1).max(3600).nullable().optional(),
  restSeconds: z.number().int().min(0).max(3600).nullable().optional(),
  alternativeGroup: z.string().trim().max(120).nullable().optional(),
});
export const workoutCardExerciseDeleteSchema = z.object({ workoutPlanExerciseId: idSchema });

export function stationDisplay(exercise: { exerciseType: string; equipmentType: string | null; station: { displayName: string } | null }) {
  if (exercise.station?.displayName) return exercise.station.displayName;
  if (exercise.exerciseType === "DUMBBELL") return "Dumbbell Zone";
  if (exercise.exerciseType === "BARBELL") return "Barbell Zone";
  if (exercise.exerciseType === "CORE") return "Core Zone";
  if (exercise.exerciseType === "STEPPER") return "Stepper";
  if (exercise.exerciseType === "TRX") return "TRX Zone";
  if (exercise.exerciseType === "BODYWEIGHT") return "Bodyweight";
  if (exercise.exerciseType === "FREE_WEIGHT") return "Free Weight Zone";
  return exercise.equipmentType ?? "Workout Floor";
}

export async function getActiveWorkout(memberUserId: string) {
  const assignment = await prisma.memberWorkoutAssignment.findFirst({
    where: { memberId: memberUserId, status: "ACTIVE" },
    orderBy: { assignedAt: "desc" },
    include: {
      workoutPlan: { include: { days: { orderBy: { sortOrder: "asc" }, include: { exercises: { orderBy: { sortOrder: "asc" }, include: { exercise: { include: { station: true } } } } } } } },
      progress: true,
    },
  });
  if (!assignment) return null;
  return buildWorkoutView(assignment);
}

export async function selectWorkoutGoal(memberUserId: string, input: unknown) {
  const { fitnessGoal, workoutPlanSlug } = goalSchema.parse(input);
  const planSlug = workoutPlanSlug ?? GOAL_PLAN_SLUG[fitnessGoal];
  const plan = await prisma.workoutPlan.findUnique({ where: { slug: planSlug }, select: { id: true } });
  if (!plan) throw new AppError("WORKOUT_PLAN_MISSING", "Workout plan is not available yet.", 400);
  return prisma.$transaction(async (tx) => {
    const active = await tx.memberWorkoutAssignment.findFirst({ where: { memberId: memberUserId, status: "ACTIVE" } });
    if (active) throw new AppError("WORKOUT_EXISTS", "You already have an active workout plan.", 409);
    return tx.memberWorkoutAssignment.create({ data: { memberId: memberUserId, workoutPlanId: plan.id, fitnessGoal, startedAt: new Date() } });
  });
}

export async function replaceWorkoutGoal(memberUserId: string, input: unknown) {
  const { fitnessGoal, workoutPlanSlug } = goalSchema.parse(input);
  const plan = await prisma.workoutPlan.findUnique({ where: { slug: workoutPlanSlug ?? GOAL_PLAN_SLUG[fitnessGoal] }, select: { id: true } });
  if (!plan) throw new AppError("WORKOUT_PLAN_MISSING", "Workout plan is not available yet.", 400);
  return prisma.$transaction(async (tx) => {
    await tx.memberWorkoutAssignment.updateMany({ where: { memberId: memberUserId, status: "ACTIVE" }, data: { status: "REPLACED", completedAt: new Date() } });
    return tx.memberWorkoutAssignment.create({ data: { memberId: memberUserId, workoutPlanId: plan.id, fitnessGoal, startedAt: new Date() } });
  });
}

export async function getWorkoutDay(memberUserId: string, dayNumber: number) {
  const active = await getActiveWorkout(memberUserId);
  if (!active) throw new AppError("WORKOUT_REQUIRED", "Select a workout goal first.", 404);
  const day = active.days.find((item) => item.dayNumber === dayNumber);
  if (!day) throw new AppError("DAY_NOT_FOUND", "Workout day not found.", 404);
  return { assignment: active.summary, day };
}

export async function completeExercise(memberUserId: string, input: unknown) {
  const { workoutPlanExerciseId, completed } = completeExerciseSchema.parse(input);
  const active = await prisma.memberWorkoutAssignment.findFirst({ where: { memberId: memberUserId, status: "ACTIVE" }, select: { id: true } });
  if (!active) throw new AppError("WORKOUT_REQUIRED", "Select a workout goal first.", 404);
  return prisma.memberExerciseProgress.upsert({
    where: { memberWorkoutAssignmentId_workoutPlanExerciseId: { memberWorkoutAssignmentId: active.id, workoutPlanExerciseId } },
    create: { memberWorkoutAssignmentId: active.id, workoutPlanExerciseId, completed, completedAt: completed ? new Date() : null },
    update: { completed, completedAt: completed ? new Date() : null },
  });
}

export async function setCurrentDay(memberUserId: string, dayNumber: number) {
  if (!Number.isInteger(dayNumber) || dayNumber < 1) throw new AppError("INVALID_DAY", "Invalid workout day.", 400);
  await prisma.memberWorkoutAssignment.updateMany({ where: { memberId: memberUserId, status: "ACTIVE" }, data: { currentDay: dayNumber } });
}

export async function getWorkoutHistory(memberUserId: string) {
  return prisma.memberWorkoutAssignment.findMany({
    where: { memberId: memberUserId },
    orderBy: { assignedAt: "desc" },
    select: { id: true, fitnessGoal: true, status: true, assignedAt: true, completedAt: true, workoutPlan: { select: { name: true, level: true } }, _count: { select: { progress: true } } },
  });
}

export async function getAdminWorkoutConsole() {
  const [plans, exercises, stations, members] = await Promise.all([
    prisma.workoutPlan.findMany({
      orderBy: [{ level: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { days: true, assignments: true } },
        days: {
          orderBy: { sortOrder: "asc" },
          include: {
            exercises: { orderBy: { sortOrder: "asc" }, include: { exercise: { include: { station: true } } } },
          },
        },
      },
    }),
    prisma.exercise.findMany({ orderBy: { name: "asc" }, include: { station: true } }),
    prisma.gymStation.findMany({ orderBy: { stationCode: "asc" } }),
    prisma.user.findMany({ where: { role: Role.MEMBER, isActive: true }, orderBy: { displayName: "asc" }, take: 100, select: { id: true, displayName: true, mobileNumber: true, member: { select: { fullName: true, admissionId: true } } } }),
  ]);
  return { plans, exercises, stations, members };
}

export async function adminAddWorkoutCardExercise(input: unknown) {
  const data = workoutCardExerciseCreateSchema.parse(input);
  if (data.minimumReps != null && data.maximumReps != null && data.maximumReps < data.minimumReps) {
    throw new AppError("INVALID_REP_RANGE", "Maximum reps must be greater than or equal to minimum reps.", 400);
  }
  return prisma.$transaction(async (tx) => {
    const last = await tx.workoutPlanExercise.findFirst({
      where: { workoutPlanDayId: data.workoutPlanDayId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    return tx.workoutPlanExercise.create({
      data: {
        workoutPlanDayId: data.workoutPlanDayId,
        exerciseId: data.exerciseId,
        sortOrder: (last?.sortOrder ?? 0) + 1,
        sectionName: data.sectionName,
        sets: data.sets,
        reps: data.reps,
        minimumReps: data.minimumReps,
        maximumReps: data.maximumReps,
        holdSeconds: data.holdSeconds,
        restSeconds: data.restSeconds,
        alternativeGroup: data.alternativeGroup || null,
      },
    });
  });
}

export async function adminDeleteWorkoutCardExercise(input: unknown) {
  const { workoutPlanExerciseId } = workoutCardExerciseDeleteSchema.parse(input);
  return prisma.workoutPlanExercise.delete({ where: { id: workoutPlanExerciseId } });
}

export async function adminAssignWorkout(adminUserId: string, input: unknown) {
  const data = adminAssignSchema.parse(input);
  return prisma.$transaction(async (tx) => {
    if (data.replaceActive) {
      await tx.memberWorkoutAssignment.updateMany({ where: { memberId: data.memberUserId, status: AssignmentStatus.ACTIVE }, data: { status: AssignmentStatus.REPLACED, completedAt: new Date() } });
    }
    return tx.memberWorkoutAssignment.create({ data: { memberId: data.memberUserId, workoutPlanId: data.workoutPlanId, fitnessGoal: data.fitnessGoal, assignedById: adminUserId, startedAt: new Date() } });
  });
}

export async function adminUpdateExercise(input: unknown) {
  const { exerciseId, ...data } = exerciseUpdateSchema.parse(input);
  if (data.videoStartSeconds != null && data.videoEndSeconds != null && data.videoEndSeconds <= data.videoStartSeconds) {
    throw new AppError("INVALID_VIDEO_SEGMENT", "Video end time must be after the start time.", 400);
  }
  const update: Prisma.ExerciseUpdateInput = {
    instructions: data.instructions,
    safetyInstructions: data.safetyInstructions,
    active: data.active,
    videoStartSeconds: data.videoStartSeconds,
    videoEndSeconds: data.videoEndSeconds,
  };
  if (data.videoUrl !== undefined) {
    if (data.videoUrl === null || data.videoUrl === "") {
      update.youtubeVideoId = null;
      update.videoUrl = null;
      update.thumbnailUrl = null;
      update.videoStartSeconds = null;
      update.videoEndSeconds = null;
      update.videoStatus = "NEEDS_OWNER_CONFIRMATION";
    } else {
      const youtubeId = parseYouTubeId(data.videoUrl);
      if (!youtubeId) throw new AppError("INVALID_VIDEO_URL", "Enter a valid YouTube video URL or video ID.", 400);
      update.youtubeVideoId = youtubeId;
      update.videoUrl = youtubeEmbedUrl(youtubeId, { startSeconds: data.videoStartSeconds, endSeconds: data.videoEndSeconds });
      update.thumbnailUrl = youtubeThumbnailUrl(youtubeId);
      update.videoStatus = "VERIFIED";
    }
  }
  return prisma.exercise.update({ where: { id: exerciseId }, data: update });
}

export async function adminCreateExercise(input: unknown) {
  const data = exerciseCreateSchema.parse(input);
  if (data.videoStartSeconds != null && data.videoEndSeconds != null && data.videoEndSeconds <= data.videoStartSeconds) {
    throw new AppError("INVALID_VIDEO_SEGMENT", "Video end time must be after the start time.", 400);
  }
  let youtubeVideoId: string | null = null;
  if (data.videoUrl) {
    youtubeVideoId = parseYouTubeId(data.videoUrl);
    if (!youtubeVideoId) throw new AppError("INVALID_VIDEO_URL", "Enter a valid YouTube video URL or video ID.", 400);
  }
  const baseSlug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "exercise";
  let slug = baseSlug;
  for (let index = 2; await prisma.exercise.findUnique({ where: { slug }, select: { id: true } }); index += 1) {
    slug = `${baseSlug}-${index}`;
  }
  return prisma.exercise.create({
    data: {
      slug,
      name: data.name,
      exerciseType: data.exerciseType,
      equipmentType: data.equipmentType || null,
      stationId: data.stationId || null,
      instructions: data.instructions || null,
      safetyInstructions: data.safetyInstructions || null,
      youtubeVideoId,
      videoStartSeconds: data.videoStartSeconds,
      videoEndSeconds: data.videoEndSeconds,
      videoUrl: youtubeVideoId ? youtubeEmbedUrl(youtubeVideoId, { startSeconds: data.videoStartSeconds, endSeconds: data.videoEndSeconds }) : null,
      thumbnailUrl: youtubeVideoId ? youtubeThumbnailUrl(youtubeVideoId) : null,
      videoStatus: youtubeVideoId ? "VERIFIED" : "NEEDS_OWNER_CONFIRMATION",
    },
  });
}

export function availableGoalCards() {
  return goalCards;
}

type AssignmentWithPlan = Prisma.MemberWorkoutAssignmentGetPayload<{
  include: {
    workoutPlan: { include: { days: { include: { exercises: { include: { exercise: { include: { station: true } } } } } } } };
    progress: true;
  };
}>;

const verifiedExerciseVideos = new Map(
  dataset.exercises
    .filter((exercise) => exercise.status === "VERIFIED" && exercise.video?.youtubeId)
    .map((exercise) => [exercise.id, exercise.video])
);

function exerciseWithSeededVideo(exercise: AssignmentWithPlan["workoutPlan"]["days"][number]["exercises"][number]["exercise"]) {
  if (exercise.videoStatus === "VERIFIED" && exercise.youtubeVideoId) return exercise;
  const seededVideo = exercise.externalId ? verifiedExerciseVideos.get(exercise.externalId) : null;
  if (!seededVideo?.youtubeId) return exercise;
  return {
    ...exercise,
    videoStatus: "VERIFIED" as const,
    youtubeVideoId: seededVideo.youtubeId,
    videoUrl: youtubeEmbedUrl(seededVideo.youtubeId),
    thumbnailUrl: youtubeThumbnailUrl(seededVideo.youtubeId),
    videoTitle: seededVideo.title,
    videoChannel: seededVideo.channel,
    videoDuration: seededVideo.duration,
  };
}

function buildWorkoutView(assignment: AssignmentWithPlan) {
  const completed = new Set(assignment.progress.filter((item) => item.completed).map((item) => item.workoutPlanExerciseId));
  const selected = new Map(assignment.progress.map((item) => [item.workoutPlanExerciseId, item.selected]));
  const days = assignment.workoutPlan.days.map((day) => {
    const required = day.exercises.filter((item) => !item.alternativeGroup || selected.get(item.id) !== false);
    const done = required.filter((item) => completed.has(item.id)).length;
    return {
      id: day.id,
      dayNumber: day.dayNumber,
      title: day.title,
      estimatedMinutes: day.estimatedMinutes,
      muscleGroups: [...new Set(day.exercises.map((item) => item.sectionName).filter((name) => name !== "Warm-Up"))],
      completed: required.length > 0 && done === required.length,
      completedCount: done,
      totalCount: required.length,
      progressPercent: required.length ? Math.round((done / required.length) * 100) : 0,
      exercises: day.exercises.map((item) => ({
        id: item.id,
        sortOrder: item.sortOrder,
        sectionName: item.sectionName,
        sets: item.sets,
        reps: item.reps,
        minimumReps: item.minimumReps,
        maximumReps: item.maximumReps,
        holdSeconds: item.holdSeconds,
        restSeconds: item.restSeconds,
        alternativeGroup: item.alternativeGroup,
        completed: completed.has(item.id),
        exercise: { ...exerciseWithSeededVideo(item.exercise), stationDisplay: stationDisplay(item.exercise) },
      })),
    };
  });
  const total = days.reduce((sum, day) => sum + day.totalCount, 0);
  const done = days.reduce((sum, day) => sum + day.completedCount, 0);
  const nextDay = days.find((day) => !day.completed) ?? days[0];
  const nextExercise = nextDay?.exercises.find((item) => !item.completed);
  return {
    summary: {
      assignmentId: assignment.id,
      fitnessGoal: assignment.fitnessGoal,
      planName: assignment.workoutPlan.name,
      level: assignment.workoutPlan.level,
      currentDay: assignment.currentDay,
      weeklyPercent: total ? Math.round((done / total) * 100) : 0,
      completedDays: days.filter((day) => day.completed).length,
      totalDays: days.length,
      completedExercises: done,
      totalExercises: total,
      streak: days.filter((day) => day.completed).length,
      continueDay: nextDay?.dayNumber ?? 1,
      continueExerciseId: nextExercise?.id ?? null,
    },
    days,
  };
}
