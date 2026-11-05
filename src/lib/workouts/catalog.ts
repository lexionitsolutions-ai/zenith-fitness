import type { ExerciseType, FitnessGoal, WorkoutLevel } from "@prisma/client";
import { ABS, CARDIO, OPTIONAL_CARDIO, foundation, library, performance, levels } from "@/data/workouts/zenith-cards";

export const GOAL_PLAN_SLUG: Record<FitnessGoal, string> = {
  WEIGHT_LOSS: "zenith-level-1-foundation",
  GENERAL_FITNESS: "zenith-level-1-foundation",
  WEIGHT_GAIN: "zenith-level-2-strength-builder",
  BUILD_ENDURANCE: "zenith-level-2-strength-builder",
};

export type WorkoutSeedExercise = {
  section: string;
  name: string;
  notes?: string;
  sets?: number;
  reps?: number;
  minimumReps?: number;
  maximumReps?: number;
  holdSeconds?: number;
  restSeconds?: number;
  alternativeGroup?: string;
};
export type WorkoutSeedDay = { day: number; title: string; description: string; minutes?: number; exercises: WorkoutSeedExercise[] };
export type WorkoutSeedPlan = { slug: string; name: string; level: WorkoutLevel; description: string; days: WorkoutSeedDay[] };

const guidance = "Your trainer will guide you on sets, repetitions, weights, and cardio.";
const optionsGuidance = "Available exercise options: your trainer selects exercises, sets, reps, weights, and cardio. Abs are available options, not a required circuit.";
const exercises = (section: string, items: string[]): WorkoutSeedExercise[] => items.map((item) => {
  const [name, variation] = item.split("|");
  return { section, name, notes: variation ? `Variations: ${variation}. Trainer selects.` : undefined };
});
const groups = (...names: (keyof typeof library)[]) => names.flatMap((name) => exercises(name, library[name]));
const day = (number: number, title: string, items: WorkoutSeedExercise[] = [], description = guidance): WorkoutSeedDay =>
  ({ day: number, title, description, exercises: items });

export const workoutPlans: WorkoutSeedPlan[] = [
  {
    slug: "zenith-level-1-foundation", name: "Level 1 — Foundation", level: "BEGINNER",
    description: levels[0].footer,
    days: foundation.flatMap((week, weekIndex) => [
      ...week.flatMap((items, index) => [
        day(weekIndex * 7 + index * 2 + 1, `Week ${weekIndex + 1} · Day ${index * 2 + 1} — Mixed workout ${String.fromCharCode(65 + weekIndex * 3 + index)}`,
          items.map((name) => ({ section: ABS.includes(name) ? "Abs" : "Mixed workout", name }))),
        day(weekIndex * 7 + index * 2 + 2, `Week ${weekIndex + 1} · Day ${index * 2 + 2} — Cardio`, [], CARDIO),
      ]),
      day(weekIndex * 7 + 7, `Week ${weekIndex + 1} · Day 7 — Rest`, [], "Rest day."),
    ]),
  },
  {
    slug: "zenith-level-2-strength-builder", name: "Level 2 — Strength Builder", level: "INTERMEDIATE",
    description: levels[1].footer,
    days: [
      day(1, "Chest + Cardio", groups("Chest"), `${optionsGuidance} ${CARDIO}`),
      day(2, "Back + Cardio", groups("Back"), `${optionsGuidance} ${CARDIO}`),
      day(3, "Quad-Dominant Legs + Abs + Cardio", groups("Quad-Dominant Legs", "Abs"), `${optionsGuidance} ${CARDIO}`),
      day(4, "Shoulders + Cardio", groups("Shoulders"), `${optionsGuidance} ${CARDIO}`),
      day(5, "Biceps / Triceps + Cardio", groups("Biceps", "Triceps"), `${optionsGuidance} Trainer selects biceps / triceps emphasis. ${CARDIO}`),
      day(6, "Hamstrings & Glutes + Abs + Cardio", groups("Hamstrings & Glutes", "Abs"), `${optionsGuidance} ${CARDIO}`),
      day(7, "Rest", [], "Rest day."),
    ],
  },
  {
    slug: "zenith-level-3-performance", name: "Level 3 — Performance", level: "ADVANCED",
    description: levels[2].footer,
    days: [
      ...performance.map((session, index) => day([1, 2, 4, 5][index], session.title,
        session.groups.flatMap(([name, items]) => exercises(name as string, items as string[])), `${optionsGuidance} ${OPTIONAL_CARDIO}`)),
      day(3, "Recovery", [], "Recovery day. Follow your trainer's guidance."),
      day(6, "Optional Cardio / Mobility", [], OPTIONAL_CARDIO),
      day(7, "Rest", [], "Rest day."),
    ].sort((a, b) => a.day - b.day),
  },
];

export const goalCards = workoutPlans.map((plan, index) => ({
  goal: (index === 0 ? "GENERAL_FITNESS" : "WEIGHT_GAIN") as FitnessGoal,
  planSlug: plan.slug,
  name: plan.name,
  explanation: plan.description,
  level: plan.level,
  levelNumber: index + 1,
  days: plan.days.length,
  style: levels[index].format,
}));

// Zenith Fitness machine station mapping. These random station numbers are stable;
// physically label the matching gym machines with the same station number.
export const stationMapping = {
  SMITH_MACHINE: "STATION_07",
  ADJUSTABLE_BENCH_PRESS: "STATION_03",
  LAT_PULLDOWN: "STATION_11",
  PEC_FLY: "STATION_05",
  FLAT_CHEST_PRESS: "STATION_09",
  INCLINE_CHEST_PRESS: "STATION_02",
  LEG_EXTENSION_CURL: "STATION_12",
  ASSISTED_PULLUP: "STATION_04",
  MFT_MACHINE: "STATION_08",
  ABDUCTOR_ADDUCTOR: "STATION_01",
  LEG_PRESS: "STATION_10",
} as const;

export const tempStations = [
  ["STATION_01", "Station 01", "Abductor/Adductor Machine"],
  ["STATION_02", "Station 02", "Incline Chest Press"],
  ["STATION_03", "Station 03", "Adjustable Bench Press"],
  ["STATION_04", "Station 04", "Assisted Pull Up"],
  ["STATION_05", "Station 05", "Pec Fly"],
  ["STATION_07", "Station 07", "Smith Machine"],
  ["STATION_08", "Station 08", "MFT Machine"],
  ["STATION_09", "Station 09", "Flat Chest Press"],
  ["STATION_10", "Station 10", "Leg Press Machine"],
  ["STATION_11", "Station 11", "Lat Pull Down"],
  ["STATION_12", "Station 12", "Leg Extension + Curl"],
] as const;

export function slugifyExercise(name: string) {
  return name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const machineByName: Record<string, keyof typeof stationMapping> = {
  "Flat Chest Press": "FLAT_CHEST_PRESS",
  "Incline Chest Press": "INCLINE_CHEST_PRESS",
  "Decline Chest Press": "ADJUSTABLE_BENCH_PRESS",
  "Lat Pulldown": "LAT_PULLDOWN",
  "Close-Grip Lat Pulldown": "LAT_PULLDOWN",
  "Seated Row": "MFT_MACHINE",
  "Single-Hand Row": "MFT_MACHINE",
  "Single-Arm Row": "MFT_MACHINE",
  "T-Bar Row": "MFT_MACHINE",
  "Leg Press": "LEG_PRESS",
  "Leg Extension": "LEG_EXTENSION_CURL",
  "Leg Curl": "LEG_EXTENSION_CURL",
  "Hamstring Curl": "LEG_EXTENSION_CURL",
  "Shoulder Press": "ADJUSTABLE_BENCH_PRESS",
  "Pec Fly": "PEC_FLY",
  "Assisted Pull-Ups": "ASSISTED_PULLUP",
  "Abduction": "ABDUCTOR_ADDUCTOR",
  "Adduction": "ABDUCTOR_ADDUCTOR",
  "Hip Abduction": "ABDUCTOR_ADDUCTOR",
  "Hip Adduction": "ABDUCTOR_ADDUCTOR",
  "Squats": "SMITH_MACHINE",
  "Wide Squats": "SMITH_MACHINE",
  "Close-Grip Press": "SMITH_MACHINE",
  "Barbell Deadlift": "SMITH_MACHINE",
};

export function classifyExercise(name: string, section: string): { type: ExerciseType; equipment: string; stationCode: string | null } {
  const machineKey = machineByName[name];
  if (machineKey) return { type: "MACHINE", equipment: "Machine", stationCode: stationMapping[machineKey] };
  if (/stepper|step-up|burpees on stepper/i.test(name + section)) return { type: "STEPPER", equipment: "Stepper", stationCode: null };
  if (/db |dumbbell/i.test(name)) return { type: "DUMBBELL", equipment: "Dumbbell", stationCode: null };
  if (/barbell|deadlift/i.test(name)) return { type: "BARBELL", equipment: "Barbell", stationCode: null };
  if (/cable|pushdown/i.test(name)) return { type: "CABLE", equipment: "Cable", stationCode: null };
  if (/trx/i.test(name)) return { type: "TRX", equipment: "TRX", stationCode: null };
  if (/core|crunch|plank|leg raises|v-up|russian|kick|dead bug|hollow|flutter|bicycle|knee tuck/i.test(name + section)) return { type: "CORE", equipment: "Core Zone", stationCode: null };
  if (/warm|jump|knees|run|push-up|squat|burpee|climber|tap|touch|jack|dips|lunge|bridge|crawl|bird dog|arm circles|wall sit|skater|fast feet|mobility|stretch|marching/i.test(name + section)) return { type: "BODYWEIGHT", equipment: "Bodyweight", stationCode: null };
  return { type: "FREE_WEIGHT", equipment: "Free Weight Zone", stationCode: null };
}
