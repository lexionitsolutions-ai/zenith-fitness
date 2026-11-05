"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Activity, ArrowDown, ArrowUp, Check, Clock3, Play, Plus, Trash2 } from "lucide-react";
import type { getFunctionalWorkouts } from "@/services/functional-workout.service";
import { workDuration } from "@/lib/workouts/functional-player";
import { BatchPlayer } from "./functional-batch-player";
import { FunctionalVideo } from "./functional-video";
import { FunctionalVideoForm } from "./functional-video-form";

type Data = Awaited<ReturnType<typeof getFunctionalWorkouts>>;
type Batch = Data["batches"][number];
type DraftExercise = { exerciseId: string; workSeconds: number; restSeconds: number; repetitions: number | null; repsPerSecond: number };
const field = "mt-1 min-h-12 w-full rounded-xl border border-white/15 bg-[#10201b] px-3 text-white";
const formatTime = (seconds: number) => `${Math.floor(Math.ceil(seconds) / 60)}:${String(Math.ceil(seconds) % 60).padStart(2, "0")}`;

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
        return <button type="button" key={item.id} aria-pressed={isSelected} onClick={() => setSelected((items) => isSelected ? items.filter((entry) => entry.exerciseId !== item.id) : [...items, { exerciseId: item.id, workSeconds: 40, restSeconds: 20, repetitions: null, repsPerSecond: 0.5 }])} className={`flex min-h-12 items-center justify-between rounded-xl border px-3 text-left text-sm ${isSelected ? "border-zenith-400/40 bg-zenith-500/10 text-zenith-300" : "border-white/10 bg-black/20"}`}><span>{item.name}</span>{isSelected ? <Check size={18} /> : <Plus size={18} />}</button>;
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
        <div className="mt-3 grid grid-cols-2 gap-3"><label className="text-xs text-white/60">Work (sec)<input required type="number" min={5} max={600} value={entry.workSeconds} onChange={(e) => change(index, { workSeconds: Number(e.target.value) })} className={field} /></label>
          <label className="text-xs text-white/60">Rest (sec)<input required type="number" min={0} max={300} value={entry.restSeconds} onChange={(e) => change(index, { restSeconds: Number(e.target.value) })} className={field} /></label>
          <label className="text-xs text-white/60">Reps (optional)<input type="number" min={1} max={1000} value={entry.repetitions ?? ""} onChange={(e) => change(index, { repetitions: e.target.value ? Number(e.target.value) : null })} className={field} /></label>
          <label className="text-xs text-white/60">Reps per second<input required type="number" min={0.1} max={5} step={0.05} value={entry.repsPerSecond} onChange={(e) => change(index, { repsPerSecond: Number(e.target.value) })} className={field} /></label></div>
        <p className="mt-2 text-xs text-white/45">{entry.repetitions ? `${entry.repetitions} reps at ${entry.repsPerSecond} reps/sec = ${formatTime(workDuration(entry))}. Rep target takes priority over work time.` : `Timed exercise; counter follows ${entry.repsPerSecond} reps/sec.`}</p>
      </li>)}</ol>
    </section>
    {error && <p role="alert" className="rounded-2xl bg-red-400/10 p-4 text-sm text-red-200">{error}</p>}
    <div className="flex flex-wrap gap-3"><button disabled={saving} className="min-h-12 rounded-2xl bg-zenith-500 px-6 font-bold text-slate-950 disabled:opacity-50">{saving ? "Saving batch..." : "Save batch"}</button><button type="button" disabled={saving} onClick={onCancel} className="min-h-12 rounded-2xl border border-white/15 px-5">Cancel</button></div>
  </form>;
}

export function FunctionalWorkouts({ initialData, canManage }: { initialData: Data; canManage: boolean }) {
  const [data, setData] = useState(initialData);
  const [creating, setCreating] = useState(false);
  const [addingVideo, setAddingVideo] = useState(false);
  const [playing, setPlaying] = useState<{ batch: Batch; index: number } | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  // Keep server refreshes in sync after switching workout tabs.
  useEffect(() => setData(initialData), [initialData]);
  async function refreshLibrary() {
    const response = await fetch("/api/workout/functional", { cache: "no-store" });
    if (!response.ok) throw new Error("Batch saved. Refresh Workouts to load the latest batches.");
    const result = await response.json();
    setData(result.data);
  }
  async function onSaved(id: string) {
    await refreshLibrary(); setCreating(false); setSaved(id);
  }
  function openPlayer(batch: Batch, index: number) {
    document.querySelectorAll("video").forEach((video) => video.pause());
    setPlaying({ batch, index });
  }
  return <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 sm:px-8">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-zenith-400">Train together</p><h1 className="mt-2 text-3xl font-black">Functional batches</h1><p className="mt-2 max-w-xl text-sm text-white/55">Follow your trainer’s exercise order. Play the demos and train with the batch timer.</p></div>
      {canManage && <div className="flex flex-wrap gap-1 rounded-2xl bg-white/5 p-1"><button onClick={() => { setCreating(false); setAddingVideo(false); }} aria-pressed={!creating && !addingVideo} className="min-h-11 rounded-xl px-3 text-sm font-bold">View batches</button><button onClick={() => { setCreating(true); setAddingVideo(false); setSaved(null); }} aria-pressed={creating} className={`flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-bold ${creating ? "bg-zenith-500 text-slate-950" : "text-zenith-400"}`}><Plus size={16} />Create batch</button><button onClick={() => { setCreating(false); setAddingVideo(true); }} aria-pressed={addingVideo} className={`min-h-11 rounded-xl px-3 text-sm font-bold ${addingVideo ? "bg-zenith-500 text-slate-950" : "text-zenith-400"}`}>Add video</button></div>}
    </header>
    {saved && !creating && <p role="status" className="mt-5 rounded-2xl border border-zenith-400/25 bg-zenith-500/10 p-4 text-sm text-zenith-300">Batch saved. Members can now view and play it in Functional Batch.</p>}
    {addingVideo && canManage ? <FunctionalVideoForm onSaved={refreshLibrary} /> : creating && canManage ? <BatchBuilder exercises={data.exercises} onSaved={onSaved} onCancel={() => setCreating(false)} /> : <section aria-label="Available functional batches" className="mx-auto mt-6 max-w-3xl space-y-6">
      {!data.batches.length && <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white/60">No functional batches yet.{canManage ? " Create the first batch for members." : " Your trainer’s batches will appear here."}</div>}
      {data.batches.map((batch) => <article key={batch.id} className={`overflow-hidden rounded-3xl border bg-white/[.04] ${saved === batch.id ? "border-zenith-400/50" : "border-white/10"}`}>
        <div className="p-5"><div className="flex items-start justify-between gap-3"><span className="rounded-2xl bg-zenith-500/10 p-3 text-zenith-400"><Activity /></span><span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/65">{batch.rounds} {batch.rounds === 1 ? "round" : "rounds"}</span></div>
          <h2 className="mt-4 text-xl font-black">{batch.title}</h2>{batch.description && <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-white/55">{batch.description}</p>}
          {batch.scheduledAt && <p className="mt-3 text-sm text-zenith-300">{new Date(batch.scheduledAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })} IST</p>}
          <p className="mt-3 flex items-center gap-2 text-xs text-white/45"><Clock3 size={14} />{batch.exercises.length} exercises · {formatTime(batch.exercises.reduce((sum, item) => sum + workDuration(item) + item.restSeconds, 0) * batch.rounds - (batch.exercises.at(-1)?.restSeconds ?? 0))} circuit</p>
          {batch.createdBy && <p className="mt-2 text-xs text-white/40">By {batch.createdBy.displayName ?? (batch.createdBy.role === "ADMIN" ? "Admin" : "Trainer")}</p>}
          <button disabled={!batch.exercises.length} onClick={() => openPlayer(batch, 0)} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-zenith-500 px-4 font-bold text-slate-950 disabled:opacity-40"><Play size={18} />Play batch</button>
        </div><ol className="space-y-4 border-t border-white/10 p-3">{batch.exercises.map((item, index) => <li key={item.id} className="overflow-hidden rounded-2xl bg-[#12263A] p-3">
          <h3 className="mb-2 text-base font-bold text-zenith-300">{index + 1}. {item.exercise.name}</h3>
          <div className="mx-auto aspect-[9/16] w-full max-w-[300px] overflow-hidden rounded-xl bg-black"><FunctionalVideo exercise={item.exercise} preview /></div>
          <p className="mt-3 text-xs text-white/55">{item.repetitions ? `${item.repetitions} reps` : `${item.workSeconds}s work`} · {item.repsPerSecond} reps/sec · {item.restSeconds}s rest</p>
          <button onClick={() => openPlayer(batch, index)} aria-label={`Play ${item.exercise.name}`} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-white/10 text-sm font-bold"><Play size={16} />Train with rep counter</button>
        </li>)}</ol>
      </article>)}
    </section>}
    {playing && <BatchPlayer batch={playing.batch} initialIndex={playing.index} onClose={() => setPlaying(null)} />}
  </main>;
}
