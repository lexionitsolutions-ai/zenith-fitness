import { describe, expect, it } from "vitest";
import { advanceCircuit, nextCircuitExercise, remainingWork, startCircuit, tickCircuit, workDuration } from "./functional-player";

describe("functional circuit playback", () => {
  const exercises = [{ workSeconds: 5, restSeconds: 2 }, { workSeconds: 6, restSeconds: 0 }];
  it("starts with the requested exercise and its saved work time", () => {
    expect(startCircuit(exercises, 1)).toEqual({ index: 1, round: 1, phase: "work", seconds: 6, reps: 0 });
  });
  it("moves from work to rest and then the next exercise", () => {
    const rest = tickCircuit({ ...startCircuit(exercises), seconds: 1 }, exercises, 2);
    expect(rest).toMatchObject({ index: 0, phase: "rest", seconds: 2 });
    expect(tickCircuit({ ...rest, seconds: 1 }, exercises, 2)).toMatchObject({ index: 1, phase: "work", seconds: 6 });
  });
  it("repeats rounds, skips zero rest, and completes after the last work interval", () => {
    const lastExercise = { ...startCircuit(exercises, 1), seconds: 1 };
    const round2 = tickCircuit(lastExercise, exercises, 2);
    expect(round2).toEqual({ index: 0, round: 2, phase: "work", seconds: 5, reps: 0 });
    expect(tickCircuit({ ...lastExercise, round: 2 }, exercises, 2)).toMatchObject({ phase: "complete", seconds: 0 });
  });
  it("does not add a final rest or advance after completion", () => {
    const items = [{ workSeconds: 5, restSeconds: 20 }];
    const complete = tickCircuit({ ...startCircuit(items), seconds: 1 }, items, 1);
    expect(complete.phase).toBe("complete");
    expect(tickCircuit(complete, items, 1)).toEqual(complete);
    expect(nextCircuitExercise(startCircuit(exercises), exercises, 2).index).toBe(1);
  });
  it("counts fractional paced reps using elapsed time and stops at the rep target", () => {
    const items = [{ workSeconds: 40, restSeconds: 0, repetitions: 5, repsPerSecond: 2 }];
    expect(workDuration(items[0])).toBe(2.5);
    const state = advanceCircuit(startCircuit(items), items, 1, 1.25);
    expect(state.reps).toBe(2.5);
    expect(state.seconds).toBe(1.25);
    expect(advanceCircuit(state, items, 1, 10)).toMatchObject({ phase: "complete", reps: 5, seconds: 0 });
  });
  it("preserves counted reps on pause and pace changes", () => {
    const items = [{ workSeconds: 40, restSeconds: 0, repetitions: 10, repsPerSecond: 1 }];
    const state = advanceCircuit(startCircuit(items), items, 1, 2);
    expect(advanceCircuit(state, items, 1, 0)).toEqual(state);
    const faster = [{ ...items[0], repsPerSecond: 2 }];
    expect(remainingWork(state, faster[0])).toBe(4);
    expect(advanceCircuit(state, faster, 1, 1)).toMatchObject({ reps: 4, seconds: 3 });
  });
  it("does not count reps during rest and resets the next exercise's counter", () => {
    const items = [{ workSeconds: 5, restSeconds: 2, repetitions: 2, repsPerSecond: 2 }, { workSeconds: 5, restSeconds: 0, repsPerSecond: 1 }];
    const rest = advanceCircuit(startCircuit(items), items, 1, 1.5);
    expect(rest).toMatchObject({ phase: "rest", reps: 2, seconds: 1.5 });
    expect(advanceCircuit(rest, items, 1, 1.5)).toMatchObject({ index: 1, phase: "work", reps: 0 });
  });
});
