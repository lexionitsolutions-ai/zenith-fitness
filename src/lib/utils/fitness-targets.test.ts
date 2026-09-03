import { describe, expect, it } from "vitest";
import { calculateMuscleGainProgress, calculateNextBmiDate, calculateWeightLossProgress } from "./fitness-targets";

describe("fitness target utilities", () => {
  it("calculates next BMI date from the latest completed assessment", () => {
    expect(calculateNextBmiDate(new Date("2026-09-01T00:00:00Z")).toISOString().slice(0, 10)).toBe("2026-10-16");
    expect(calculateNextBmiDate(new Date("2026-10-18T00:00:00Z")).toISOString().slice(0, 10)).toBe("2026-12-02");
  });

  it("calculates and clamps weight-loss progress", () => {
    expect(calculateWeightLossProgress(90, 84, 75)).toMatchObject({ progressAmount: 6, totalRequired: 15, rawPercentage: 40, visualPercentage: 40, reached: false });
    expect(calculateWeightLossProgress(90, 95, 75).visualPercentage).toBe(0);
    expect(calculateWeightLossProgress(90, 70, 75)).toMatchObject({ visualPercentage: 100, reached: true });
  });

  it("calculates and clamps muscle-gain progress", () => {
    expect(calculateMuscleGainProgress(30, 31.5, 35)).toMatchObject({ progressAmount: 1.5, totalRequired: 5, rawPercentage: 30, visualPercentage: 30, reached: false });
    expect(calculateMuscleGainProgress(30, 29, 35).visualPercentage).toBe(0);
    expect(calculateMuscleGainProgress(30, 36, 35)).toMatchObject({ visualPercentage: 100, reached: true });
  });
});
