export type CircuitItem = { workSeconds: number; restSeconds: number };
export type CircuitState = { index: number; round: number; phase: "work" | "rest" | "complete"; seconds: number };

export function startCircuit(items: CircuitItem[], index = 0): CircuitState {
  return { index, round: 1, phase: items.length ? "work" : "complete", seconds: items[index]?.workSeconds ?? 0 };
}

export function nextCircuitExercise(state: CircuitState, items: CircuitItem[], rounds: number): CircuitState {
  if (state.index + 1 < items.length) return { ...state, index: state.index + 1, phase: "work", seconds: items[state.index + 1].workSeconds };
  if (state.round < rounds) return { index: 0, round: state.round + 1, phase: "work", seconds: items[0].workSeconds };
  return { ...state, phase: "complete", seconds: 0 };
}

export function tickCircuit(state: CircuitState, items: CircuitItem[], rounds: number): CircuitState {
  if (state.phase === "complete") return state;
  if (state.seconds > 1) return { ...state, seconds: state.seconds - 1 };
  const isLast = state.index === items.length - 1 && state.round === rounds;
  if (state.phase === "work" && !isLast && items[state.index].restSeconds > 0) {
    return { ...state, phase: "rest", seconds: items[state.index].restSeconds };
  }
  return nextCircuitExercise(state, items, rounds);
}
