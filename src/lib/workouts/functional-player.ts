export type CircuitItem = { workSeconds: number; restSeconds: number; repetitions?: number | null; repsPerSecond?: number };
export type CircuitState = { index: number; round: number; phase: "work" | "rest" | "complete"; seconds: number; reps: number };

export function repRate(item: CircuitItem) { return item.repsPerSecond ?? 0.5; }
export function workDuration(item: CircuitItem) { return item.repetitions ? item.repetitions / repRate(item) : item.workSeconds; }

export function startCircuit(items: CircuitItem[], index = 0): CircuitState {
  return { index, round: 1, phase: items.length ? "work" : "complete", seconds: items[index] ? workDuration(items[index]) : 0, reps: 0 };
}

export function nextCircuitExercise(state: CircuitState, items: CircuitItem[], rounds: number): CircuitState {
  if (state.index + 1 < items.length) return { ...state, index: state.index + 1, phase: "work", seconds: workDuration(items[state.index + 1]), reps: 0 };
  if (state.round < rounds) return { index: 0, round: state.round + 1, phase: "work", seconds: workDuration(items[0]), reps: 0 };
  return { ...state, phase: "complete", seconds: 0 };
}

export function remainingWork(state: CircuitState, item: CircuitItem) {
  return item.repetitions ? Math.max(0, (item.repetitions - state.reps) / repRate(item)) : state.seconds;
}

/** Advance using real elapsed time; fractional rep progress survives pauses and pace changes. */
export function advanceCircuit(state: CircuitState, items: CircuitItem[], rounds: number, elapsed: number): CircuitState {
  if (state.phase === "complete" || !items.length || elapsed <= 0 || !Number.isFinite(elapsed)) return state;
  let current = { ...state }, remaining = elapsed;
  while (remaining > 1e-7 && current.phase !== "complete") {
    const item = items[current.index];
    const duration = current.phase === "work" ? remainingWork(current, item) : current.seconds;
    const step = Math.min(remaining, duration);
    current.seconds = Math.max(0, duration - step);
    if (current.phase === "work") current.reps = Math.min(item.repetitions ?? Infinity, current.reps + step * repRate(item));
    remaining -= step;
    if (current.seconds > 1e-7) break;
    const isLast = current.index === items.length - 1 && current.round === rounds;
    if (current.phase === "work" && !isLast && item.restSeconds > 0) current = { ...current, phase: "rest", seconds: item.restSeconds };
    else current = nextCircuitExercise(current, items, rounds);
  }
  return current;
}
export function tickCircuit(state: CircuitState, items: CircuitItem[], rounds: number) {
  return advanceCircuit(state, items, rounds, 1);
}
