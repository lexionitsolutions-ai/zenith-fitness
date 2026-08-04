import type { ExerciseType, FitnessGoal, WorkoutLevel } from "@prisma/client";

export const GOAL_PLAN_SLUG: Record<FitnessGoal, string> = {
  WEIGHT_LOSS: "zenith-beginner",
  WEIGHT_GAIN: "zenith-intermediate",
  GENERAL_FITNESS: "zenith-beginner",
  BUILD_ENDURANCE: "zenith-intermediate",
};

export const TENTATIVE_EXERCISE_DEMO_VIDEO_URL = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

export const goalCards: {
  goal: FitnessGoal;
  planSlug: string;
  name: string;
  explanation: string;
  level: WorkoutLevel;
  days: number;
  style: string;
}[] = [
  { goal: "GENERAL_FITNESS", planSlug: "zenith-beginner", name: "Beginner", explanation: "A balanced foundation card for members starting structured gym training.", level: "BEGINNER", days: 6, style: "Full-body foundation" },
  { goal: "WEIGHT_GAIN", planSlug: "zenith-intermediate", name: "Intermediate", explanation: "Progressive resistance sessions with larger muscle-pairing blocks.", level: "INTERMEDIATE", days: 4, style: "Strength and hypertrophy" },
  { goal: "WEIGHT_GAIN", planSlug: "zenith-advanced", name: "Advance", explanation: "Approval-style advanced training with compound and isolation work.", level: "ADVANCED", days: 4, style: "High-intensity split" },
  { goal: "BUILD_ENDURANCE", planSlug: "zenith-cardio-endurance", name: "Cardiovascular Endurance", explanation: "Stepper, dumbbell cardio, and running variations for stamina.", level: "INTERMEDIATE", days: 5, style: "Cardio endurance" },
  { goal: "GENERAL_FITNESS", planSlug: "zenith-bodyweight-only", name: "BodyWeight Only Workout", explanation: "No-machine training using push, squat, plank, jump, and mobility variations.", level: "BEGINNER", days: 5, style: "Bodyweight conditioning" },
  { goal: "WEIGHT_LOSS", planSlug: "zenith-core-variations", name: "Core Variations", explanation: "Focused core sessions with anti-extension, rotation, lower-ab, and hold work.", level: "BEGINNER", days: 4, style: "Core strength" },
];

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

export type WorkoutSeedExercise = {
  section: string;
  name: string;
  sets: number;
  reps?: number;
  minimumReps?: number;
  maximumReps?: number;
  holdSeconds?: number;
  restSeconds: number;
  alternativeGroup?: string;
};

export type WorkoutSeedDay = { day: number; title: string; minutes: number; exercises: WorkoutSeedExercise[] };
export type WorkoutSeedPlan = { slug: string; name: string; level: WorkoutLevel; description: string; days: WorkoutSeedDay[] };

const warm = (name: string): WorkoutSeedExercise => ({ section: "Warm-Up", name, sets: 2, reps: 15, restSeconds: 30 });
const strength = (section: string, name: string, group?: string): WorkoutSeedExercise => ({ section, name, sets: 3, reps: 15, restSeconds: 60, alternativeGroup: group });
const cardio = (section: string, name: string): WorkoutSeedExercise => ({ section, name, sets: 2, reps: 15, restSeconds: 45 });
const adv = (section: string, name: string, reps = 15, group?: string): WorkoutSeedExercise => ({ section, name, sets: 3, reps, restSeconds: 75, alternativeGroup: group });
const compound = (section: string, name: string): WorkoutSeedExercise => ({ section, name, sets: 3, minimumReps: 8, maximumReps: 12, restSeconds: 90 });
const body = (section: string, name: string, reps = 15): WorkoutSeedExercise => ({ section, name, sets: 3, reps, restSeconds: 45 });
const hold = (section: string, name: string, seconds = 30): WorkoutSeedExercise => ({ section, name, sets: 3, holdSeconds: seconds, restSeconds: 45 });

export const workoutPlans: WorkoutSeedPlan[] = [
  { slug: "zenith-beginner", name: "Zenith Fitness Beginner Card", level: "BEGINNER", description: "Six-day foundation card with warm-ups, strength blocks, cardio, core, and stepper work.", days: [
    { day: 1, title: "Chest + Stepper", minutes: 55, exercises: ["Jumping Jacks","Butt Kicks","High Knees","Shoulder Tap","Toe Touch"].map(warm).concat(["Flat Chest Press","Incline Chest Press","Pec Fly","Decline Chest Press"].map((n)=>strength("Chest",n)),["Simple Step-Up","Side-to-Side Step","Stepper Touch Jack","Burpees on Stepper"].map((n)=>cardio("Stepper",n))) },
    { day: 2, title: "Biceps + Dumbbell Cardio", minutes: 45, exercises: ["Spot Jumps","Floor Touch Jack","Hand Walk Out","Push-Up Position Toe Touch"].map(warm).concat(["Standing Bicep Curl","Hammer Curl","Incline Bicep Curl","Wrist Curl"].map((n)=>strength("Biceps",n)),["DB In-Out","DB Soccer","DB Military Jog"].map((n)=>cardio("Dumbbell Cardio",n))) },
    { day: 3, title: "Legs + Core", minutes: 50, exercises: ["Jumping Jacks","High Knees","Toe Touch","Butt Kicks"].map(warm).concat(["Bodyweight Squats","Wide Squats","Leg Press","Leg Extension","Leg Curl"].map((n)=>strength("Legs",n)),["Toe Touch Crunches","Russian Twist","Leg Raises","Kick Out"].map((n)=>cardio("Core",n))) },
    { day: 4, title: "Back + Stepper", minutes: 50, exercises: ["High Knees","Military Jog","Spot Run"].map(warm).concat(["Lat Pulldown","Seated Row","Single-Hand Row","Assisted Pull-Ups"].map((n)=>strength("Back",n)),["Simple Step-Up","Side-to-Side Step","Burpees on Stepper","Stepper Touch Jack"].map((n)=>cardio("Stepper",n))) },
    { day: 5, title: "Triceps + Core", minutes: 45, exercises: ["Jumping Jacks","Butt Kicks","Spot Jumps","Toe Touch"].map(warm).concat(["Tricep Pushdown","Tricep Extension","Tricep Dips"].map((n)=>strength("Triceps",n)),[{ section: "Core", name: "Plank Hold", sets: 2, holdSeconds: 30, restSeconds: 45 }, ...["V-Up Hold","Plank Toe Touch","Push-Up"].map((n)=>cardio("Core",n))]) },
    { day: 6, title: "Shoulders + Bodyweight Finisher", minutes: 50, exercises: ["Floor Touch Jack","Heel Touch Run","Knee Push-Ups","Push-Up Position Jack"].map(warm).concat(["Shoulder Press","Lateral Raises","Rear Delt Fly","Shrugs"].map((n)=>strength("Shoulders",n)),["Toe Touch Push-Up Position","Mountain Climber","Side Knee Tuck","Bodyweight Squats"].map((n)=>cardio("Bodyweight Finisher",n))) },
  ]},
  { slug: "zenith-intermediate", name: "Zenith Fitness Intermediate Card", level: "INTERMEDIATE", description: "Four-day strength endurance card with larger muscle-pairing sessions.", days: [
    { day: 1, title: "Chest + Triceps + DB Endurance", minutes: 60, exercises: ["Jumping Jacks","High Knees","Shoulder Tap","Toe Touch"].map(warm).concat([strength("Chest","Bodyweight Push-Ups"),strength("Chest","Incline Chest Press"),strength("Chest","Flat Chest Press","chest-press"),strength("Chest","Decline Chest Press","chest-press"),strength("Chest","Pec Fly","fly"),strength("Chest","Cable Fly","fly"),strength("Triceps","Tricep Pushdown"),strength("Triceps","Tricep Extension"),strength("Triceps","Tricep Dips","triceps-finisher"),strength("Triceps","Skull Crushers","triceps-finisher")],["DB In-Out","DB Soccer","DB Rotation"].map((n)=>cardio("DB Endurance",n))) },
    { day: 2, title: "Back + Biceps + Stepper", minutes: 60, exercises: ["Floor Touch Jack","Heel Touch Run","Spot Jumps","High Knees"].map(warm).concat([strength("Back","Assisted Pull-Ups"),strength("Back","Lat Pulldown","lat"),strength("Back","Close-Grip Lat Pulldown","lat"),strength("Back","Seated Row"),strength("Back","Barbell Row","row"),strength("Back","T-Bar Row","row"),strength("Biceps","Standing Barbell Curl"),strength("Biceps","Preacher Curl"),strength("Biceps","Hammer Curl")],["Jump Squat","Stepper Touch Jack","Burpees on Stepper"].map((n)=>cardio("Finisher",n))) },
    { day: 3, title: "Legs + Calves", minutes: 65, exercises: ["Jumping Jacks","High Knees","Floor Touch Jack"].map(warm).concat(["Bodyweight Squats","DB Wide Squats","Leg Press","Leg Extension","Leg Curl","Abduction","Adduction","Romanian Deadlift","Calf Raises"].map((n)=>strength(n==="Calf Raises"?"Calves":"Legs",n))) },
    { day: 4, title: "Shoulders + Core", minutes: 55, exercises: ["Jumping Jacks","Floor Touch Jack","Military Jog","In-Out"].map(warm).concat(["Shoulder Press","Lateral Raises","Rear Delt Fly","Shrugs","Front Raises"].map((n)=>strength("Shoulders",n)),["Toe Touch Crunches","Kick Outs","Russian Twist","Leg Raises"].map((n)=>cardio("Core",n)),[{ section: "Core", name: "Plank Hold", sets: 2, holdSeconds: 30, restSeconds: 45 }]) },
  ]},
  { slug: "zenith-advanced", name: "Zenith Fitness Advanced Card", level: "ADVANCED", description: "Approval-only advanced card with compound, isolation, bodyweight, and core blocks.", days: [
    { day: 1, title: "Chest + Biceps", minutes: 70, exercises: ["Bodyweight Push-Ups","Plank to Push-Up","Diamond Push-Up"].map((n)=>adv("Chest Bodyweight",n,10)).concat(["Incline Chest Press","Flat Chest Press","Decline Chest Press"].map((n)=>adv("Chest",n)),[adv("Chest","Cable Fly",15,"fly-adv"),adv("Chest","Pec Fly",15,"fly-adv")],["Preacher Curl","Incline Bicep Curl","Hammer Curl"].map((n)=>adv("Biceps",n))) },
    { day: 2, title: "Back + Shoulders", minutes: 75, exercises: ["TRX Rowing","TRX Rear Delt Fly","Assisted Pull-Ups"].map((n)=>adv("Functional",n,10)).concat(["Lat Pulldown","Close-Grip Lat Pulldown"].map((n)=>adv("Back",n)),[adv("Back","Barbell Row",15,"adv-row-a"),adv("Back","Seated Row",15,"adv-row-a"),compound("Back","Barbell Deadlift"),adv("Back","T-Bar Row",15,"adv-row-b"),adv("Back","Single-Arm Row",15,"adv-row-b")],["Shoulder Press","Lateral Raises","Rear Delt Fly","Shrugs"].map((n)=>adv("Shoulders",n))) },
    { day: 3, title: "Core + Triceps + Forearms", minutes: 70, exercises: ["Close-Grip Push-Up","Tricep Pushdown","Tricep Extension","Skull Crusher","Tricep Dip","Close-Grip Press","Dumbbell Kickback"].map((n)=>adv("Triceps",n)).concat(["Toe Touch","Butterfly Crunches","Kick-Out Compression","Hanging Leg Raises"].map((n)=>adv("Core",n,20)),[{ section: "Core", name: "V-Up Hold", sets: 3, holdSeconds: 30, restSeconds: 60 }],["Dumbbell Wrist Curl","Barbell Reverse Curl"].map((n)=>adv("Forearms",n))) },
    { day: 4, title: "Legs + Calves", minutes: 75, exercises: ["Squats","Wide Squats"].map((n)=>compound("Compound Leg Work",n)).concat(["Dumbbell Romanian Deadlift","Hamstring Curl","Leg Press","Leg Extension","Hip Abduction","Hip Adduction","Pelvic Lift","Hip Thrust","Glute Bridge","Kneeling Squats","Calf Raises"].map((n)=>adv(n==="Calf Raises"?"Calves":"Leg Accessories",n))) },
  ]},
  { slug: "zenith-cardio-endurance", name: "Cardiovascular Endurance", level: "INTERMEDIATE", description: "Five-day stamina card with stepper, dumbbell cardio, running drills, and low-equipment conditioning.", days: [
    { day: 1, title: "Stepper Intervals + Run Drills", minutes: 40, exercises: ["Marching High Knees","Heel Touch Run","Spot Run"].map(warm).concat(["Simple Step-Up","Side-to-Side Step","Stepper Touch Jack","Fast Step-Up","Stepper Knee Drive"].map((n)=>cardio("Stepper",n)),["High Knees","Butt Kicks","Sprint in Place"].map((n)=>cardio("Running Variations",n))) },
    { day: 2, title: "Dumbbell Cardio Flow", minutes: 38, exercises: ["Jumping Jacks","Toe Touch","Shoulder Tap"].map(warm).concat(["DB In-Out","DB Soccer","DB Military Jog","DB Rotation","DB Punches","DB Thruster"].map((n)=>cardio("Dumbbell Cardio",n))) },
    { day: 3, title: "Bodyweight HIIT", minutes: 35, exercises: ["Spot Jumps","Floor Touch Jack","Hand Walk Out"].map(warm).concat(["Mountain Climber","Skater Jumps","Jump Squat","Plank Jack","Burpees","Fast Feet"].map((n)=>cardio("HIIT",n))) },
    { day: 4, title: "Stepper + Core Endurance", minutes: 42, exercises: ["Military Jog","High Knees","Butt Kicks"].map(warm).concat(["Simple Step-Up","Side-to-Side Step","Stepper Touch Jack","Burpees on Stepper"].map((n)=>cardio("Stepper",n)),["Russian Twist","Kick Outs","Plank Toe Touch","Leg Raises"].map((n)=>cardio("Core Endurance",n))) },
    { day: 5, title: "Endurance Test Day", minutes: 45, exercises: ["Jumping Jacks","Floor Touch Jack","Spot Run"].map(warm).concat(["Sprint in Place","High Knees","DB Military Jog","DB Soccer","Fast Step-Up","Mountain Climber","Burpees"].map((n)=>cardio("Conditioning",n))) },
  ]},
  { slug: "zenith-bodyweight-only", name: "BodyWeight Only Workout Card", level: "BEGINNER", description: "Five-day no-machine plan with extra bodyweight variations for home or gym floor training.", days: [
    { day: 1, title: "Push + Core", minutes: 35, exercises: ["Arm Circles","Shoulder Tap","Toe Touch"].map(warm).concat(["Knee Push-Ups","Push-Up","Incline Push-Up","Plank to Push-Up","Diamond Push-Up"].map((n)=>body("Push",n,10)),[hold("Core","Plank Hold",30),body("Core","Dead Bug",16)]) },
    { day: 2, title: "Legs + Glutes", minutes: 38, exercises: ["High Knees","Butt Kicks","Spot Jumps"].map(warm).concat(["Bodyweight Squats","Wide Squats","Reverse Lunges","Walking Lunges","Glute Bridge"].map((n)=>body("Legs",n,15)),[hold("Legs","Wall Sit",30)]) },
    { day: 3, title: "Cardio Bodyweight", minutes: 32, exercises: ["Floor Touch Jack","Heel Touch Run","Spot Run"].map(warm).concat(["Jumping Jacks","Mountain Climber","Skater Jumps","Burpees","Plank Jack","Fast Feet"].map((n)=>cardio("Cardio",n))) },
    { day: 4, title: "Mobility + Stability", minutes: 30, exercises: ["Toe Touch","Hand Walk Out","Shoulder Tap"].map(warm).concat(["Bird Dog","Bear Crawl","Side Plank Reach","Hip Hinge","World's Greatest Stretch"].map((n)=>body("Stability",n,12))) },
    { day: 5, title: "Full Body Circuit", minutes: 40, exercises: ["Jumping Jacks","High Knees","Butt Kicks"].map(warm).concat(["Push-Up","Bodyweight Squats","Reverse Lunges","Mountain Climber","Plank Toe Touch","Burpees"].map((n)=>body("Circuit",n,12))) },
  ]},
  { slug: "zenith-core-variations", name: "Core Variations Card", level: "BEGINNER", description: "Four-day core card with crunches, holds, rotation, compression, and lower-ab variations.", days: [
    { day: 1, title: "Crunch + Lower Abs", minutes: 30, exercises: ["Toe Touch","High Knees","Spot Run"].map(warm).concat(["Toe Touch Crunches","Butterfly Crunches","Reverse Crunch","Leg Raises","Flutter Kicks"].map((n)=>body("Core",n,20))) },
    { day: 2, title: "Plank Holds", minutes: 28, exercises: ["Shoulder Tap","Hand Walk Out","Toe Touch"].map(warm).concat([hold("Core","Plank Hold",30),hold("Core","Side Plank Left",25),hold("Core","Side Plank Right",25),body("Core","Plank Toe Touch",16),body("Core","Plank Shoulder Tap",16)]) },
    { day: 3, title: "Rotation + Compression", minutes: 32, exercises: ["Jumping Jacks","Floor Touch Jack","Spot Jumps"].map(warm).concat(["Russian Twist","Kick Outs","V-Ups","Seated Knee Tuck","Bicycle Crunches"].map((n)=>body("Core",n,20))) },
    { day: 4, title: "Core Finisher", minutes: 34, exercises: ["High Knees","Butt Kicks","Military Jog"].map(warm).concat(["Mountain Climber","Dead Bug","Hollow Hold","V-Up Hold","Leg Raises","Toe Touch Crunches"].map((n)=>n.includes("Hold")?hold("Core",n,30):body("Core",n,18))) },
  ]},
];
