"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Pause, Play, RotateCcw, SkipForward, X } from "lucide-react";
import type { getFunctionalWorkouts } from "@/services/functional-workout.service";
import { advanceCircuit, nextCircuitExercise, remainingWork, startCircuit } from "@/lib/workouts/functional-player";
import { FunctionalVideo } from "./functional-video";

type Batch = Awaited<ReturnType<typeof getFunctionalWorkouts>>["batches"][number];
const time = (seconds: number) => `${Math.floor(Math.ceil(seconds) / 60)}:${String(Math.ceil(seconds) % 60).padStart(2, "0")}`;

export function BatchPlayer({ batch, initialIndex, onClose }: { batch: Batch; initialIndex: number; onClose: () => void }) {
  const [state, setState] = useState(() => startCircuit(batch.exercises, initialIndex));
  const [running, setRunning] = useState(false);
  const [mediaPlaying, setMediaPlaying] = useState(false);
  const [rates, setRates] = useState<Record<string, number>>({});
  const items = useMemo(() => batch.exercises.map((item) => ({ ...item, repsPerSecond: rates[item.id] ?? item.repsPerSecond })), [batch, rates]);
  const container = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const item = items[state.index];
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; closeButton.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const controls = container.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),a[href],iframe,[tabindex="0"]');
      const first = controls?.[0], last = controls?.[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", onKey); previousFocus?.focus(); };
  }, [onClose]);
  useEffect(() => {
    if (!running || state.phase === "complete" || (state.phase === "work" && !mediaPlaying)) return;
    let previous = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now(); const elapsed = (now - previous) / 1000; previous = now;
      setState((current) => advanceCircuit(current, items, batch.rounds, elapsed));
    }, 100);
    return () => window.clearInterval(timer);
  }, [running, state.phase, mediaPlaying, items, batch.rounds]);
  if (!item) return null;
  function setPace(value: number) {
    if (!Number.isFinite(value) || value < 0.1 || value > 5) return;
    setRates((current) => ({ ...current, [item.id]: value }));
    if (state.phase === "work") setState((current) => ({ ...current, seconds: remainingWork(current, { ...item, repsPerSecond: value }) }));
  }
  const count = Math.floor(state.reps + 1e-7);
  return <div ref={container} role="dialog" aria-modal="true" aria-labelledby="functional-player-title" className="fixed inset-0 z-50 overflow-y-auto bg-[#0B1C2D] px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(.75rem+env(safe-area-inset-top))]">
    <div className="mx-auto max-w-lg">
      <header className="mb-3 flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-zenith-400">{batch.title}</p><h2 id="functional-player-title" className="mt-1 text-xl font-black">{state.phase === "complete" ? "Batch complete" : item.exercise.name}</h2></div><button ref={closeButton} onClick={onClose} aria-label="Close player" className="flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-white/10"><X /></button></header>
      {state.phase === "complete" ? <div className="rounded-3xl bg-[#12263A] p-8 text-center"><Check size={44} className="mx-auto text-zenith-400" /><p className="mt-3 text-2xl font-bold">Batch complete</p><p className="mt-2 text-white/60">{batch.rounds} {batch.rounds === 1 ? "round" : "rounds"} finished.</p></div> : <>
        <div data-testid="portrait-player" className="relative mx-auto aspect-[9/16] w-[min(100%,36dvh)] overflow-hidden rounded-2xl bg-black shadow-2xl">
          <FunctionalVideo key={item.id} exercise={item.exercise} playing={running && state.phase === "work"} onPlayingChange={setRunning} onMediaPlayingChange={setMediaPlaying} />
          <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between bg-gradient-to-b from-black/80 to-transparent p-3 text-xs font-bold"><span className="rounded-full bg-black/50 px-3 py-2">Round {state.round}/{batch.rounds}</span><span className="rounded-full bg-black/50 px-3 py-2 tabular-nums">{time(state.seconds)}</span></div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/75 to-transparent px-4 pb-5 pt-12 text-center">
            <p className="text-xs font-bold uppercase tracking-[.2em] text-zenith-300">{state.phase === "rest" ? "Rest" : "Paced reps"}</p>
            {state.phase === "rest" ? <p className="text-6xl font-black tabular-nums">{time(state.seconds)}</p> : <p className="mt-1"><output aria-label="Paced rep count" className="text-7xl font-black tabular-nums text-white">{count}</output>{item.repetitions && <span className="ml-2 text-2xl font-bold text-white/45">/ {item.repetitions}</span>}</p>}
            <p className="mt-2 text-xs text-white/60">{item.exercise.name}</p>
          </div>
        </div>
        <div className="mt-4 rounded-2xl bg-[#12263A] p-4"><p className="text-xs text-white/50">Exercise {state.index + 1}/{items.length} · {item.repsPerSecond} reps/sec · 1 rep every {(1 / item.repsPerSecond).toFixed(2).replace(/0+$/, "").replace(/\.$/, "")} sec</p>
          {running && state.phase === "work" && !mediaPlaying && <p role="status" className="mt-2 text-xs text-zenith-300">Loading video — reps will start when it plays.</p>}
          <div className="mt-3 flex flex-wrap items-end gap-3"><label className="min-w-0 flex-1 text-xs text-white/65">Reps per second<input aria-label="Playback reps per second" type="number" min={0.1} max={5} step={0.05} value={item.repsPerSecond} onChange={(e) => setPace(Number(e.target.value))} className="mt-1 min-h-12 w-full rounded-xl border border-white/15 bg-[#0B1C2D] px-3 text-lg font-bold" /></label>
            <button onClick={() => setRunning(!running)} className="flex min-h-12 items-center gap-2 rounded-xl bg-zenith-500 px-5 font-bold text-slate-950">{running ? <Pause size={18} /> : <Play size={18} />}{running ? "Pause workout" : "Start workout"}</button></div>
          <p className="mt-3 text-xs leading-relaxed text-white/45">Reps follow the selected pace, not body-movement detection. Changing this pace affects only your session. {item.repetitions ? "The exercise finishes at the rep target." : "The exercise finishes when its timer ends."}</p>
        </div>
      </>}
      <div className="mt-3 flex gap-2"><button onClick={() => { setState(startCircuit(items)); setRunning(false); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/10 px-4"><RotateCcw size={16} />Restart</button>{state.phase !== "complete" && <button onClick={() => setState(nextCircuitExercise(state, items, batch.rounds))} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/10 px-4"><SkipForward size={16} />Next exercise</button>}</div>
      <ol className="mt-4 space-y-2">{items.map((entry, index) => <li key={entry.id}><button onClick={() => { setState(startCircuit(items, index)); setRunning(false); }} aria-current={index === state.index ? "step" : undefined} className={`flex min-h-12 w-full items-center justify-between rounded-xl px-3 text-left text-sm ${index === state.index ? "bg-zenith-500/15 text-zenith-300" : "bg-white/5 text-white/60"}`}><span>{index + 1}. {entry.exercise.name}</span><Play size={15} /></button></li>)}</ol>
    </div>
  </div>;
}
