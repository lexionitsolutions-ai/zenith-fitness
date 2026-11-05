import type { Prisma } from "@prisma/client";
import { classifyExercise, slugifyExercise, tempStations, workoutPlans } from "./catalog";

/** Sync only workout data. New card exercises intentionally start without videos. */
export async function syncWorkoutCards(tx: Prisma.TransactionClient) {
  const slugs = workoutPlans.map((plan) => plan.slug);
  const previousPlans = await tx.workoutPlan.findMany({ where: { slug: { notIn: slugs } }, select: { id: true } });
  const previousIds = previousPlans.map((plan) => plan.id);
  // Retire old cards without erasing member history or progress.
  const retiredAssignments = await tx.memberWorkoutAssignment.updateMany({
    where: { workoutPlanId: { in: previousIds }, status: "ACTIVE" }, data: { status: "REPLACED", completedAt: new Date() } });
  await tx.workoutPlan.updateMany({ where: { id: { in: previousIds } }, data: { active: false } });

  const stations = new Map<string, string>();
  for (const [stationCode, displayName, machineName] of tempStations) {
    const station = await tx.gymStation.upsert({ where: { stationCode },
      create: { stationCode, displayName, machineName }, update: { displayName, machineName } });
    stations.set(stationCode, station.id);
  }
  const exerciseIds = new Map<string, string>();
  for (const plan of workoutPlans) {
    const record = await tx.workoutPlan.upsert({ where: { slug: plan.slug },
      create: { slug: plan.slug, name: plan.name, level: plan.level, description: plan.description, totalDays: plan.days.length },
      update: { name: plan.name, level: plan.level, description: plan.description, totalDays: plan.days.length, active: true } });
    for (const day of plan.days) {
      const workoutDay = await tx.workoutPlanDay.upsert({
        where: { workoutPlanId_dayNumber: { workoutPlanId: record.id, dayNumber: day.day } },
        create: { workoutPlanId: record.id, dayNumber: day.day, title: day.title, description: day.description, estimatedMinutes: null, sortOrder: day.day },
        update: { title: day.title, description: day.description, estimatedMinutes: null, sortOrder: day.day },
      });
      const obsolete = { workoutPlanDayId: workoutDay.id, sortOrder: { gt: day.exercises.length } };
      await tx.memberExerciseProgress.deleteMany({ where: { workoutPlanExercise: obsolete } });
      await tx.workoutPlanExercise.deleteMany({ where: obsolete });
      for (const [index, item] of day.exercises.entries()) {
        // Separate identities prevent old seeded demos from carrying into new cards.
        const slug = `zenith-cards-${slugifyExercise(item.name)}`;
        let exerciseId = exerciseIds.get(slug);
        if (!exerciseId) {
          const classification = classifyExercise(item.name, item.section);
          const metadata = { name: item.name, exerciseType: classification.type, equipmentType: classification.equipment,
            stationId: classification.stationCode ? stations.get(classification.stationCode) : null, active: true };
          const exercise = await tx.exercise.upsert({ where: { slug },
            create: { ...metadata, slug, category: item.section,
              instructions: "Follow your trainer's exercise selection, sets, repetitions, weights, and form guidance.",
              videoUrl: null, youtubeVideoId: null, thumbnailUrl: null },
            update: metadata });
          exerciseId = exercise.id;
          exerciseIds.set(slug, exerciseId);
        }
        const prescription = { exerciseId, sectionName: item.section, notes: item.notes ?? null,
          sets: null, reps: null, minimumReps: null, maximumReps: null, holdSeconds: null, restSeconds: null, alternativeGroup: null };
        await tx.workoutPlanExercise.upsert({ where: { workoutPlanDayId_sortOrder: { workoutPlanDayId: workoutDay.id, sortOrder: index + 1 } },
          create: { ...prescription, workoutPlanDayId: workoutDay.id, sortOrder: index + 1 }, update: prescription });
      }
    }
  }
  await tx.exercise.updateMany({ where: { slug: { notIn: [...exerciseIds.keys()] }, workoutExercises: { none: { workoutPlanDay: { workoutPlan: { active: true } } } } }, data: { active: false } });
  return { cards: slugs.length, days: workoutPlans.reduce((sum, plan) => sum + plan.days.length, 0), exercises: exerciseIds.size,
    archivedCards: previousIds.length, retiredAssignments: retiredAssignments.count };
}
