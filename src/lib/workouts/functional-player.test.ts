import { describe, expect, it } from "vitest";
import { nextCircuitExercise, startCircuit, tickCircuit } from "./functional-player";

describe("functional circuit playback", () => {
  const exercises = [{ workSeconds: 5, restSeconds: 2 }, { workSeconds: 6, restSeconds: 0 }];
  it("starts with the requested exercise and its saved work time", () => {
    expect(startCircuit(exercises, 1)).toEqual({ index: 1, round: 1, phase: "work", seconds: 6 });
  });
  it("moves from work to rest and then the next exercise", () => {
    const rest = tickCircuit({ ...startCircuit(exercises), seconds: 1 }, exercises, 2);
    expect(rest).toMatchObject({ index: 0, phase: "rest", seconds: 2 });
    expect(tickCircuit({ ...rest, seconds: 1 }, exercises, 2)).toMatchObject({ index: 1, phase: "work", seconds: 6 });
  });
  it("repeats rounds, skips zero rest, and completes after the last work interval", () => {
    const lastExercise = { ...startCircuit(exercises, 1), seconds: 1 };
    const round2 = tickCircuit(lastExercise, exercises, 2);
    expect(round2).toEqual({ index: 0, round: 2, phase: "work", seconds: 5 });
    expect(tickCircuit({ ...lastExercise, round: 2 }, exercises, 2)).toMatchObject({ phase: "complete", seconds: 0 });
  });
  it("does not add a final rest or advance after completion", () => {
    const items = [{ workSeconds: 5, restSeconds: 20 }];
    const complete = tickCircuit({ ...startCircuit(items), seconds: 1 }, items, 1);
    expect(complete.phase).toBe("complete");
    expect(tickCircuit(complete, items, 1)).toEqual(complete);
    expect(nextCircuitExercise(startCircuit(exercises), exercises, 2).index).toBe(1);
  });
});
