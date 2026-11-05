import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import { mkdirSync, writeFileSync } from "node:fs";
import { syncWorkoutCards } from "../src/lib/workouts/sync";
import { workoutPlans } from "../src/lib/workouts/catalog";

loadEnvConfig(process.cwd());
const db = new PrismaClient();
async function main() {
  const currentSlugs = workoutPlans.map((plan) => plan.slug);
  const previous = await db.workoutPlan.findMany({ where: { slug: { notIn: currentSlugs } }, include: {
    days: { include: { exercises: { include: { exercise: true } } } },
    assignments: { include: { progress: true } },
  } });
  console.log(JSON.stringify({ previousCards: previous.map((plan) => ({ name: plan.name, assignments: plan.assignments.length })),
    replacementCards: workoutPlans.map((plan) => ({ name: plan.name, days: plan.days.length })) }, null, 2));
  if (!process.argv.includes("--apply")) return;
  // Keep a reference copy; old plans, assignments, and progress stay in the database.
  if (previous.length) {
    mkdirSync("output/workout-cards", { recursive: true });
    const backup = `output/workout-cards/previous-cards-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    writeFileSync(backup, JSON.stringify(previous, null, 2));
    console.log(`Recovery copy: ${backup}`);
  }
  const result = await db.$transaction((tx) => syncWorkoutCards(tx), { timeout: 120000, maxWait: 10000 });
  const plans = await db.workoutPlan.findMany({ where: { active: true }, include: { _count: { select: { days: true } } } });
  const attachedVideos = await db.exercise.count({ where: { workoutExercises: { some: { workoutPlanDay: { workoutPlan: { active: true } } } },
    OR: [{ youtubeVideoId: { not: null } }, { videoUrl: { not: null } }] } });
  console.log(JSON.stringify({ ...result, verifiedCards: plans.map((plan) => ({ name: plan.name, days: plan._count.days })), attachedVideos }, null, 2));
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => db.$disconnect());
