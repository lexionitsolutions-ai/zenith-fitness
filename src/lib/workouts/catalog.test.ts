import { describe, expect, it } from "vitest";
import { classifyExercise, GOAL_PLAN_SLUG, goalCards, slugifyExercise, stationMapping, workoutPlans } from "./catalog";

describe("workout catalog", () => {
  it("maps first-time goals to beginner or intermediate plans only", () => {
    expect(GOAL_PLAN_SLUG.WEIGHT_LOSS).toBe("zenith-beginner");
    expect(GOAL_PLAN_SLUG.GENERAL_FITNESS).toBe("zenith-beginner");
    expect(GOAL_PLAN_SLUG.WEIGHT_GAIN).toBe("zenith-intermediate");
    expect(GOAL_PLAN_SLUG.BUILD_ENDURANCE).toBe("zenith-intermediate");
    expect(Object.values(GOAL_PLAN_SLUG)).not.toContain("zenith-advanced");
  });

  it("keeps workout plan slugs stable for idempotent seeds", () => {
    expect(workoutPlans.map((plan) => plan.slug)).toEqual(["zenith-beginner", "zenith-intermediate", "zenith-advanced", "zenith-cardio-endurance", "zenith-bodyweight-only", "zenith-core-variations"]);
    expect(slugifyExercise("Flat Chest Press or Decline Chest Press")).toBe("flat-chest-press-or-decline-chest-press");
  });

  it("offers six member-selectable workout cards", () => {
    expect(goalCards.map((card) => card.name)).toEqual(["Beginner", "Intermediate", "Advance", "Cardiovascular Endurance", "BodyWeight Only Workout", "Core Variations"]);
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

  it("stores intermediate alternatives as grouped choices", () => {
    const day = workoutPlans.find((plan) => plan.slug === "zenith-intermediate")?.days[0];
    const group = day?.exercises.filter((exercise) => exercise.alternativeGroup === "fly").map((exercise) => exercise.name);
    expect(group).toEqual(["Pec Fly", "Cable Fly"]);
  });
});
