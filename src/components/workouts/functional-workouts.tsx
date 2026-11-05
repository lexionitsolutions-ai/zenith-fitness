"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Activity, ArrowDown, ArrowUp, Check, Clock3, Pause, Play, Plus, RotateCcw, SkipForward, Trash2, X } from "lucide-react";
import type { getFunctionalWorkouts } from "@/services/functional-workout.service";
import { nextCircuitExercise, startCircuit, tickCircuit } from "@/lib/workouts/functional-player";

type Data = Awaited<ReturnType<typeof getFunctionalWorkouts>>;
type Batch = Data["batches"][number];
type DraftExercise = { exerciseId: string; workSeconds: number; restSeconds: number; repetitions: number | null };
const field = "mt-1 min-h-12 w-full rounded-xl border border-white/15 bg-[#10201b] px-3 text-white";
const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

function BatchPlayer({ batch, initialIndex, onClose }: { batch: Batch; initialIndex: number; onClose: () => void }) {
  const [state, setState] = useState(() => startCircuit(batch.exercises, initialIndex));
  const [running, setRunning] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const item = batch.exercises[state.index];
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const controls = container.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],video[controls],[tabindex="0"]');
      const first = controls?.[0], last = controls?.[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener("keydown", onKey); previousFocus?.focus(); };
  }, [onClose]);
  useEffect(() => {
    if (!running || state.phase === "complete") return;
    const timer = window.setInterval(() => setState((current) => tickCircuit(current, batch.exercises, batch.rounds)), 1000);
    return () => window.clearInterval(timer);
  }, [running, state.phase, batch]);
  if (!item) return null;
  return <div ref={container} role="dialog" aria-modal="true" aria-labelledby="functional-player-title" className="fixed inset-0 z-50 overflow-y-auto bg-[#07110e]/95 p-3 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))] backdrop-blur sm:p-8">
    <div className="mx-auto max-w-3xl rounded-3xl border border-white/15 bg-[#10201b] p-4 sm:p-6">
      <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-widest text-zenith-400">{batch.title}</p><h2 id="functional-player-title" className="mt-1 text-2xl font-black">{state.phase === "complete" ? "Batch complete" : item.exercise.name}</h2></div>
        <button ref={closeButton} onClick={onClose} aria-label="Close player" className="flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-white/10"><X /></button></div>
      {state.phase === "complete" ? <div className="my-5 rounded-2xl bg-zenith-500/10 p-8 text-center"><Check size={44} className="mx-auto text-zenith-400" /><p className="mt-3 text-xl font-bold">You finished {batch.rounds} {batch.rounds === 1 ? "round" : "rounds"}.</p></div> : <>
        <div className="relative mt-5 overflow-hidden rounded-2xl bg-black">
          <video key={item.exercise.id} src={item.exercise.videoUrl} controls autoPlay loop muted playsInline preload="metadata" className="aspect-video w-full object-contain" aria-label={`${item.exercise.name} demonstration`} />
          {state.phase === "rest" && <div className="absolute inset-0 flex items-center justify-center bg-black/85 text-center"><div><p className="text-xl font-bold">Rest</p><p className="mt-2 text-6xl font-black text-zenith-400">{formatTime(state.seconds)}</p></div></div>}
        </div>
        <p className="mt-3 text-sm text-white/60">Exercise {state.index + 1} of {batch.exercises.length} · Round {state.round} of {batch.rounds}{item.repetitions ? ` · ${item.repetitions} reps` : ""}</p>
        <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/5 p-4"><div><p className="text-xs uppercase tracking-widest text-white/50">{state.phase === "rest" ? "Rest timer" : "Exercise timer"}</p><p className="text-4xl font-black tabular-nums text-zenith-400">{formatTime(state.seconds)}</p></div><button onClick={() => setRunning(!running)} className="flex min-h-12 items-center gap-2 rounded-xl bg-zenith-500 px-5 font-bold text-slate-950">{running ? <Pause size={18} /> : <Play size={18} />}{running ? "Pause timer" : "Start timer"}</button></div>
        <p className="mt-3 text-xs text-white/45">The demo loops for practice. Start the timer when you are ready; it moves through work, rest, and each round.</p>
      </>}
      <div className="mt-4 flex flex-wrap gap-2"><button onClick={() => { setState(startCircuit(batch.exercises)); setRunning(false); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/10 px-4"><RotateCcw size={16} />Restart</button>
        {state.phase !== "complete" && <button onClick={() => setState(nextCircuitExercise(state, batch.exercises, batch.rounds))} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/10 px-4"><SkipForward size={16} />Next exercise</button>}</div>
      <ol className="mt-5 space-y-2">{batch.exercises.map((entry, index) => <li key={entry.id}><button onClick={() => { setState(startCircuit(batch.exercises, index)); setRunning(false); }} aria-current={index === state.index ? "step" : undefined} className={`flex min-h-12 w-full items-center justify-between gap-2 rounded-xl px-3 text-left text-sm ${index === state.index ? "bg-zenith-500/15 text-zenith-300" : "bg-white/5 text-white/60"}`}><span>{index + 1}. {entry.exercise.name}</span><Play size={15} /></button></li>)}</ol>
    </div>
  </div>;
}

function BatchBuilder({ exercises, onSaved, onCancel }: { exercises: Data["exercises"]; onSaved: (id: string) => Promise<void>; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [rounds, setRounds] = useState(3);
  const [scheduledAt, setScheduledAt] = useState("");
  const [selected, setSelected] = useState<DraftExercise[]>([]);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  function change(index: number, patch: Partial<DraftExercise>) { setSelected((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item)); }
  function move(index: number, offset: number) { setSelected((items) => { const result = [...items]; [result[index], result[index + offset]] = [result[index + offset], result[index]]; return result; }); }
  async function save(event: FormEvent) {
    event.preventDefault(); setError(null);
    if (!selected.length) { setError("Choose at least one exercise for this batch."); return; }
    setSaving(true);
    try {
      const response = await fetch("/api/workout/functional", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, description, rounds, scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null, exercises: selected }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "Unable to save this batch. Please try again.");
      await onSaved(result.data.id);
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to save this batch. Please try again."); }
    finally { setSaving(false); }
  }
  return <form onSubmit={save} className="mt-6 space-y-5">
    <div className="rounded-3xl border border-white/10 bg-white/[.04] p-5"><h2 className="text-xl font-bold">Create a functional batch</h2><p className="mt-1 text-sm text-white/50">Choose exercises in order, set the timing, and save the batch for members.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm text-white/65 sm:col-span-2">Batch name<input required minLength={2} maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} className={field} placeholder="Morning functional batch" /></label>
        <label className="text-sm text-white/65">Rounds<input required type="number" min={1} max={20} value={rounds} onChange={(e) => setRounds(Number(e.target.value))} className={field} /></label>
        <label className="text-sm text-white/65">Session date and time (optional)<input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className={field} /></label>
        <label className="text-sm text-white/65 sm:col-span-2">Trainer notes (optional)<textarea maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} className={`${field} min-h-24 py-3`} placeholder="Equipment, intensity, or modifications for this batch" /></label></div>
    </div>
    <section className="rounded-3xl border border-white/10 bg-white/[.04] p-5"><h3 className="font-bold">Exercise library</h3><label className="mt-3 block text-sm text-white/60">Find an exercise<input type="search" value={search} onChange={(e) => setSearch(e.target.value)} className={field} placeholder="Search exercises" /></label>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">{exercises.filter((item) => item.name.toLowerCase().includes(search.toLowerCase())).map((item) => {
        const isSelected = selected.some((entry) => entry.exerciseId === item.id);
        return <button type="button" key={item.id} aria-pressed={isSelected} onClick={() => setSelected((items) => isSelected ? items.filter((entry) => entry.exerciseId !== item.id) : [...items, { exerciseId: item.id, workSeconds: 40, restSeconds: 20, repetitions: null }])} className={`flex min-h-12 items-center justify-between rounded-xl border px-3 text-left text-sm ${isSelected ? "border-zenith-400/40 bg-zenith-500/10 text-zenith-300" : "border-white/10 bg-black/20"}`}><span>{item.name}</span>{isSelected ? <Check size={18} /> : <Plus size={18} />}</button>;
      })}</div>
    </section>
    <section className="rounded-3xl border border-white/10 bg-white/[.04] p-5"><h3 className="font-bold">Batch order · {selected.length} exercises</h3>
      {!selected.length && <p className="mt-3 text-sm text-white/50">Add exercises from the library above.</p>}
      <ol className="mt-4 space-y-3">{selected.map((entry, index) => <li key={entry.exerciseId} className="rounded-2xl bg-black/25 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><b>{index + 1}. {exercises.find((item) => item.id === entry.exerciseId)?.name}</b><div className="flex gap-1">
          <button type="button" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Move exercise ${index + 1} up`} className="min-h-11 min-w-11 rounded-xl bg-white/5 p-3 disabled:opacity-25"><ArrowUp size={16} /></button>
          <button type="button" disabled={index === selected.length - 1} onClick={() => move(index, 1)} aria-label={`Move exercise ${index + 1} down`} className="min-h-11 min-w-11 rounded-xl bg-white/5 p-3 disabled:opacity-25"><ArrowDown size={16} /></button>
          <button type="button" onClick={() => setSelected((items) => items.filter((_, i) => i !== index))} aria-label={`Remove exercise ${index + 1}`} className="min-h-11 min-w-11 rounded-xl bg-white/5 p-3 text-red-300"><Trash2 size={16} /></button>
        </div></div>
        <div className="mt-3 grid grid-cols-3 gap-2"><label className="text-xs text-white/60">Work (sec)<input required type="number" min={5} max={600} value={entry.workSeconds} onChange={(e) => change(index, { workSeconds: Number(e.target.value) })} className={field} /></label>
          <label className="text-xs text-white/60">Rest (sec)<input required type="number" min={0} max={300} value={entry.restSeconds} onChange={(e) => change(index, { restSeconds: Number(e.target.value) })} className={field} /></label>
          <label className="text-xs text-white/60">Reps (optional)<input type="number" min={1} max={1000} value={entry.repetitions ?? ""} onChange={(e) => change(index, { repetitions: e.target.value ? Number(e.target.value) : null })} className={field} /></label></div>
      </li>)}</ol>
    </section>
    {error && <p role="alert" className="rounded-2xl bg-red-400/10 p-4 text-sm text-red-200">{error}</p>}
    <div className="flex flex-wrap gap-3"><button disabled={saving} className="min-h-12 rounded-2xl bg-zenith-500 px-6 font-bold text-slate-950 disabled:opacity-50">{saving ? "Saving batch..." : "Save batch"}</button><button type="button" disabled={saving} onClick={onCancel} className="min-h-12 rounded-2xl border border-white/15 px-5">Cancel</button></div>
  </form>;
}

export function FunctionalWorkouts({ initialData, canManage }: { initialData: Data; canManage: boolean }) {
  const [data, setData] = useState(initialData);
  const [creating, setCreating] = useState(false);
  const [playing, setPlaying] = useState<{ batch: Batch; index: number } | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  // Keep server refreshes in sync after switching workout tabs.
  useEffect(() => setData(initialData), [initialData]);
  async function onSaved(id: string) {
    const response = await fetch("/api/workout/functional", { cache: "no-store" });
    if (!response.ok) throw new Error("Batch saved. Refresh Workouts to load the latest batches.");
    const result = await response.json();
    setData(result.data); setCreating(false); setSaved(id);
  }
  return <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 sm:px-8">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-zenith-400">Train together</p><h1 className="mt-2 text-3xl font-black">Functional batches</h1><p className="mt-2 max-w-xl text-sm text-white/55">Follow your trainer’s exercise order. Play the demos and train with the batch timer.</p></div>
      {canManage && <div className="flex gap-2 rounded-2xl bg-white/5 p-1"><button onClick={() => setCreating(false)} aria-pressed={!creating} className={`min-h-11 rounded-xl px-4 text-sm font-bold ${!creating ? "bg-white/10 text-white" : "text-white/50"}`}>View batches</button><button onClick={() => { setCreating(true); setSaved(null); }} aria-pressed={creating} className={`flex min-h-11 items-center gap-1 rounded-xl px-4 text-sm font-bold ${creating ? "bg-zenith-500 text-slate-950" : "text-zenith-400"}`}><Plus size={16} />Create batch</button></div>}
    </header>
    {saved && !creating && <p role="status" className="mt-5 rounded-2xl border border-zenith-400/25 bg-zenith-500/10 p-4 text-sm text-zenith-300">Batch saved. Members can now view and play it in Functional Batch.</p>}
    {creating && canManage ? <BatchBuilder exercises={data.exercises} onSaved={onSaved} onCancel={() => setCreating(false)} /> : <section aria-label="Available functional batches" className="mt-6 grid items-start gap-4 md:grid-cols-2">
      {!data.batches.length && <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/60">No functional batches yet.{canManage ? " Create the first batch for members." : " Your trainer’s batches will appear here."}</div>}
      {data.batches.map((batch) => <article key={batch.id} className={`overflow-hidden rounded-3xl border bg-white/[.04] ${saved === batch.id ? "border-zenith-400/50" : "border-white/10"}`}>
        <div className="p-5"><div className="flex items-start justify-between gap-3"><span className="rounded-2xl bg-zenith-500/10 p-3 text-zenith-400"><Activity /></span><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/65">{batch.rounds} {batch.rounds === 1 ? "round" : "rounds"}</span></div>
          <h2 className="mt-4 text-xl font-black">{batch.title}</h2>{batch.description && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-white/55">{batch.description}</p>}
          {batch.scheduledAt && <p className="mt-3 text-sm text-zenith-300">{new Date(batch.scheduledAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })} IST</p>}
          <p className="mt-3 flex items-center gap-2 text-xs text-white/45"><Clock3 size={14} />{batch.exercises.length} exercises · {formatTime(batch.exercises.reduce((sum, item) => sum + item.workSeconds + item.restSeconds, 0) * batch.rounds - (batch.exercises.at(-1)?.restSeconds ?? 0))} circuit</p>
          {batch.createdBy && <p className="mt-2 text-xs text-white/40">By {batch.createdBy.displayName ?? (batch.createdBy.role === "ADMIN" ? "Admin" : "Trainer")}</p>}
          <button disabled={!batch.exercises.length} onClick={() => setPlaying({ batch, index: 0 })} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-zenith-500 px-4 font-bold text-slate-950 disabled:opacity-40"><Play size={18} />Play batch</button>
        </div><ol className="border-t border-white/10 p-3">{batch.exercises.map((item, index) => <li key={item.id}><button onClick={() => setPlaying({ batch, index })} aria-label={`Play ${item.exercise.name}`} className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl px-3 py-3 text-left hover:bg-white/5"><div><p className="text-sm font-bold"><span className="mr-2 text-white/30">{String(index + 1).padStart(2, "0")}</span>{item.exercise.name}</p><p className="mt-1 pl-6 text-xs text-white/45">{item.workSeconds}s work · {item.restSeconds}s rest{item.repetitions ? ` · ${item.repetitions} reps` : ""}</p></div><Play size={17} className="shrink-0 text-zenith-400" /></button></li>)}</ol>
      </article>)}
    </section>}
    {playing && <BatchPlayer batch={playing.batch} initialIndex={playing.index} onClose={() => setPlaying(null)} />}
  </main>;
}
