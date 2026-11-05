import { describe, expect, it } from "vitest";
import { classifyExercise, GOAL_PLAN_SLUG, goalCards, slugifyExercise, stationMapping, workoutPlans } from "./catalog";

describe("workout catalog", () => {
  it("maps first-time goals to beginner or intermediate plans only", () => {
    expect(GOAL_PLAN_SLUG.WEIGHT_LOSS).toBe("zenith-level-1-foundation");
    expect(GOAL_PLAN_SLUG.GENERAL_FITNESS).toBe("zenith-level-1-foundation");
    expect(GOAL_PLAN_SLUG.WEIGHT_GAIN).toBe("zenith-level-2-strength-builder");
    expect(GOAL_PLAN_SLUG.BUILD_ENDURANCE).toBe("zenith-level-2-strength-builder");
    expect(Object.values(GOAL_PLAN_SLUG)).not.toContain("zenith-level-3-performance");
  });

  it("keeps workout plan slugs stable for idempotent seeds", () => {
    expect(workoutPlans.map((plan) => plan.slug)).toEqual(["zenith-level-1-foundation", "zenith-level-2-strength-builder", "zenith-level-3-performance"]);
    expect(slugifyExercise("Flat Chest Press or Decline Chest Press")).toBe("flat-chest-press-or-decline-chest-press");
  });

  it("offers only the three updated levels", () => {
    expect(goalCards.map((card) => card.name)).toEqual(["Level 1 — Foundation", "Level 2 — Strength Builder", "Level 3 — Performance"]);
    expect(goalCards.map((card) => card.levelNumber)).toEqual([1, 2, 3]);
  });

  it("uses numbered stations only for fixed mapped machines", () => {
    expect(classifyExercise("Flat Chest Press", "Chest").stationCode).toBe(stationMapping.FLAT_CHEST_PRESS);
    expect(classifyExercise("Leg Curl", "Legs").stationCode).toBe(stationMapping.LEG_EXTENSION_CURL);
    expect(classifyExercise("Abduction", "Legs").stationCode).toBe(stationMapping.ABDUCTOR_ADDUCTOR);
    expect(classifyExercise("Seated Row", "Back").stationCode).toBe(stationMapping.MFT_MACHINE);
    expect(classifyExercise("Jumping Jacks", "Warm-Up")).toMatchObject({ equipment: "Bodyweight", stationCode: null });
    expect(classifyExercise("DB Soccer", "Dumbbell Cardio")).toMatchObject({ equipment: "Dumbbell", stationCode: null });
    expect(classifyExercise("Stepper Touch Jack", "Stepper")).toMatchObject({ equipment: "Stepper", stationCode: null });
    expect(classifyExercise("Bird Dog", "Stability")).toMatchObject({ equipment: "Bodyweight", stationCode: null });
    expect(classifyExercise("Hollow Hold", "Core")).toMatchObject({ equipment: "Core Zone", stationCode: null });
  });

  it("preserves the two-week foundation schedule without inventing prescriptions", () => {
    const plan = workoutPlans[0];
    expect(plan.days.map((day) => day.day)).toEqual(Array.from({ length: 14 }, (_, index) => index + 1));
    expect(plan.days.filter((day) => day.exercises.length)).toHaveLength(6);
    expect(plan.days[0].exercises.map((item) => item.name)).toEqual(["Bodyweight Squats", "Machine Flat Chest Press", "Lat Pulldown", "Leg Extension", "Machine Shoulder Press", "Triceps Pushdown", "Standing Dumbbell Biceps Curl", "Half Crunches"]);
    expect(plan.days[7].title).toContain("Mixed workout D");
    for (const item of workoutPlans.flatMap((plan) => plan.days.flatMap((day) => day.exercises))) {
      expect(item.sets).toBeUndefined();
      expect(item.reps).toBeUndefined();
    }
  });

  it("preserves intermediate variations, abs choices, and advanced recovery days", () => {
    expect(workoutPlans[1].days[0].exercises[0]).toMatchObject({ name: "Flat Chest Press", notes: "Variations: Barbell / Dumbbell / Machine. Trainer selects." });
    expect(workoutPlans[1].days[2].exercises.filter((item) => item.section === "Abs")).toHaveLength(9);
    const advanced = workoutPlans[2].days;
    expect(advanced.map((day) => day.day)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(advanced[2]).toMatchObject({ title: "Recovery", exercises: [] });
    expect(advanced[4].exercises.filter((item) => item.section === "Abs")).toHaveLength(9);
    expect(advanced[5]).toMatchObject({ title: "Optional Cardio / Mobility", exercises: [] });
  });
});
