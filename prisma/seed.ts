import { ExerciseVideoStatus, Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import dataset from "../src/data/workouts/exercises.normalized.json";
import { classifyExercise, slugifyExercise, tempStations, workoutPlans } from "../src/lib/workouts/catalog";
import { youtubeEmbedUrl, youtubeThumbnailUrl } from "../src/lib/youtube";

try {
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match && (match[1] !== "DATABASE_URL" || !process.env.DATABASE_URL)) {
      process.env[match[1]] = match[2].trim().replace(/^(["'])(.*)\1$/, "$2");
    }
  }
} catch {}

const db = new PrismaClient();

type NormalizedExercise = (typeof dataset.exercises)[number];

const normalize = (raw: string) => {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
};

async function upsertLogin(name: string, mobileRaw: string, pin: string, role: "ADMIN" | "STAFF") {
  const mobile = normalize(mobileRaw);
  if (!mobile) throw new Error(`${name} has an invalid Indian mobile number`);
  if (pin.length < 8) throw new Error(`${name}'s PIN must contain at least 8 characters`);
  const pinHash = await bcrypt.hash(pin, 12);
  await db.user.upsert({
    where: { mobileNumber: mobile },
    create: { displayName: name, mobileNumber: mobile, pinHash, role, mobileVerified: true },
    update: { displayName: name, pinHash, role, isActive: true, failedLoginCount: 0, lockedUntil: null },
  });
  return mobile;
}

async function seedMembershipAccess() {
  for (const [planCode, planName, durationDays] of [
    ["PLAN_30_DAYS", "1 Month", 30],
    ["PLAN_90_DAYS", "3 Months", 90],
    ["PLAN_180_DAYS", "6 Months", 180],
    ["PLAN_365_DAYS", "1 Year", 365],
  ] as const) {
    await db.membershipPlan.upsert({ where: { planCode }, create: { planCode, planName, durationDays }, update: { planName, durationDays } });
  }

  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) throw new Error("ADMIN_PIN is required");
  const adminMobile = await upsertLogin(process.env.ADMIN_NAME ?? "Administrator", process.env.ADMIN_MOBILE ?? "", adminPin, "ADMIN");
  const allowedStaff: string[] = [];
  for (const key of ["ARIF", "LAKHAN", "SONALI", "SAKSHI", "ATHARVA", "TRAINER1"]) {
    const name = process.env[`STAFF_${key}_NAME`];
    const mobile = process.env[`STAFF_${key}_MOBILE`];
    const pin = process.env[`STAFF_${key}_PIN`];
    if (!name && !mobile && !pin) continue;
    if (!name || !mobile || !pin) throw new Error(`Incomplete STAFF_${key} configuration`);
    allowedStaff.push(await upsertLogin(name, mobile, pin, "STAFF"));
  }
  await db.user.updateMany({ where: { role: "ADMIN", mobileNumber: { not: adminMobile } }, data: { isActive: false } });
  await db.user.updateMany({ where: { role: "STAFF", mobileNumber: { notIn: allowedStaff } }, data: { isActive: false } });
  console.log(`Seeded plans, admin, and ${allowedStaff.length} staff accounts`);
}

async function seedWorkouts() {
  const stations = new Map<string, string>();
  for (const [stationCode, displayName, machineName] of tempStations) {
    const station = await db.gymStation.upsert({
      where: { stationCode },
      create: { stationCode, displayName, machineName, location: "Temporary Zenith machine map" },
      update: { displayName, machineName, location: "Temporary Zenith machine map", active: true },
    });
    stations.set(stationCode, station.id);
  }

  const exercises = new Map<string, string>();
  for (const plan of workoutPlans) {
    for (const day of plan.days) {
      for (const item of day.exercises) {
        const slug = slugifyExercise(item.name);
        if (exercises.has(slug)) continue;
        const classification = classifyExercise(item.name, item.section);
        const exercise = await db.exercise.upsert({
          where: { slug },
          create: {
            slug,
            name: item.name,
            category: classification.type,
            location: classification.equipment,
            exerciseType: classification.type,
            equipmentType: classification.equipment,
            stationId: classification.stationCode ? stations.get(classification.stationCode) : null,
            instructions: `Perform ${item.name} with controlled form and complete the prescribed work before moving ahead.`,
            safetyInstructions: "Stop if you feel sharp pain, dizziness, or unsafe strain. Ask staff for form support when needed.",
            videoUrl: null,
            thumbnailUrl: null,
          },
          update: {
            name: item.name,
            exerciseType: classification.type,
            equipmentType: classification.equipment,
            stationId: classification.stationCode ? stations.get(classification.stationCode) : null,
          },
        });
        exercises.set(slug, exercise.id);
      }
    }
  }

  await seedWorkoutVideoDataset(stations);

  for (const plan of workoutPlans) {
    const workoutPlan = await db.workoutPlan.upsert({
      where: { slug: plan.slug },
      create: { slug: plan.slug, name: plan.name, level: plan.level, description: plan.description, totalDays: plan.days.length },
      update: { name: plan.name, level: plan.level, description: plan.description, totalDays: plan.days.length, active: true },
    });
    for (const day of plan.days) {
      const workoutDay = await db.workoutPlanDay.upsert({
        where: { workoutPlanId_dayNumber: { workoutPlanId: workoutPlan.id, dayNumber: day.day } },
        create: { workoutPlanId: workoutPlan.id, dayNumber: day.day, title: day.title, estimatedMinutes: day.minutes, sortOrder: day.day },
        update: { title: day.title, estimatedMinutes: day.minutes, sortOrder: day.day },
      });
      for (const [index, item] of day.exercises.entries()) {
        const exerciseId = exercises.get(slugifyExercise(item.name));
        if (!exerciseId) throw new Error(`Exercise not seeded: ${item.name}`);
        await db.workoutPlanExercise.upsert({
          where: { workoutPlanDayId_sortOrder: { workoutPlanDayId: workoutDay.id, sortOrder: index + 1 } },
          create: {
            workoutPlanDayId: workoutDay.id,
            exerciseId,
            sortOrder: index + 1,
            sectionName: item.section,
            sets: item.sets,
            reps: item.reps,
            minimumReps: item.minimumReps,
            maximumReps: item.maximumReps,
            holdSeconds: item.holdSeconds,
            restSeconds: item.restSeconds,
            alternativeGroup: item.alternativeGroup,
          },
          update: {
            exerciseId,
            sectionName: item.section,
            sets: item.sets,
            reps: item.reps,
            minimumReps: item.minimumReps,
            maximumReps: item.maximumReps,
            holdSeconds: item.holdSeconds,
            restSeconds: item.restSeconds,
            alternativeGroup: item.alternativeGroup,
          },
        });
      }
    }
  }
  console.log(`Seeded ${workoutPlans.length} workout plans with temporary station mappings`);
}

async function seedWorkoutVideoDataset(stations: Map<string, string>) {
  const idMap = new Map<number, string>();

  for (const item of dataset.exercises) {
    const classification = classifyExercise(item.name, item.category);
    const stationId = classification.stationCode ? stations.get(classification.stationCode) : null;
    const videoId = item.status === "VERIFIED" ? item.video?.youtubeId ?? null : null;
    const videoUrl = videoId ? youtubeEmbedUrl(videoId) : null;
    const thumbnailUrl = videoId ? youtubeThumbnailUrl(videoId) : null;
    const existing = await db.exercise.findUnique({ where: { slug: item.slug }, select: { id: true, externalId: true } });
    if (existing && existing.externalId !== item.id) {
      await db.exercise.update({ where: { id: existing.id }, data: { externalId: item.id } });
    }

    const exercise = await db.exercise.upsert({
      where: { externalId: item.id },
      create: exerciseData(item, classification, stationId, videoId, videoUrl, thumbnailUrl),
      update: exerciseData(item, classification, stationId, videoId, videoUrl, thumbnailUrl),
      select: { id: true },
    });
    idMap.set(item.id, exercise.id);

    await db.exerciseVideoCandidate.deleteMany({ where: { exerciseId: exercise.id } });
    const candidates = item.candidates.filter((candidate) => candidate.youtubeId).map((candidate) => ({
      exerciseId: exercise.id,
      youtubeId: candidate.youtubeId,
      title: candidate.title,
      channel: candidate.channel,
      description: candidate.description,
    }));
    if (candidates.length) await db.exerciseVideoCandidate.createMany({ data: candidates, skipDuplicates: true });
  }

  for (const item of dataset.exercises) {
    if (!item.duplicateVideoOfExerciseId) continue;
    const currentId = idMap.get(item.id);
    const sourceId = idMap.get(item.duplicateVideoOfExerciseId);
    if (currentId && sourceId) {
      await db.exercise.update({ where: { id: currentId }, data: { duplicateVideoOfId: sourceId } });
    }
  }
  console.log(`Seeded ${dataset.exercises.length} normalized exercise video records`);
}

function exerciseData(item: NormalizedExercise, classification: ReturnType<typeof classifyExercise>, stationId: string | null | undefined, videoId: string | null, videoUrl: string | null, thumbnailUrl: string | null): Prisma.ExerciseUncheckedCreateInput & Prisma.ExerciseUncheckedUpdateInput {
  return {
    externalId: item.id,
    slug: item.slug,
    name: item.name,
    category: item.category,
    location: item.location,
    instructions: item.instructions,
    primaryMuscles: item.primaryMuscles,
    equipment: item.equipment,
    difficulty: item.difficulty,
    movementType: item.movementType,
    videoStatus: item.status as ExerciseVideoStatus,
    youtubeVideoId: videoId,
    videoTitle: item.status === "VERIFIED" ? item.video?.title ?? null : null,
    videoChannel: item.status === "VERIFIED" ? item.video?.channel ?? null : null,
    videoDuration: item.status === "VERIFIED" ? item.video?.duration ?? null : null,
    videoUrl,
    thumbnailUrl,
    notes: item.notes,
    exerciseType: classification.type,
    equipmentType: classification.equipment,
    stationId,
    active: true,
  };
}

async function main() {
  await seedMembershipAccess();
  await seedWorkouts();
}

main().finally(() => db.$disconnect());
