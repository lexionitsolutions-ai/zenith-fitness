"use client";
import { useState, type FormEvent } from "react";

const field = "mt-1 min-h-12 w-full rounded-xl border border-white/15 bg-[#10201b] px-3 text-white";
export function FunctionalVideoForm({ onSaved }: { onSaved: () => Promise<void> }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState("");
  const [crop, setCrop] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/workout/functional/videos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, videoUrl: url, videoStartSeconds: start, videoEndSeconds: end ? Number(end) : null, videoLayout: crop ? "CENTER_CROP" : "FIT" }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "Unable to save video.");
      setName(""); setUrl(""); setMessage("Video saved to the exercise library. You can now add it to a batch."); setSaving(false);
      try { await onSaved(); }
      catch { setMessage("Video saved. Refresh Workouts to load the updated exercise library."); }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save video."); }
    finally { setSaving(false); }
  }
  return <form onSubmit={save} className="mt-6 rounded-3xl border border-white/10 bg-white/[.04] p-5"><h2 className="text-xl font-bold">Add your workout video</h2>
    <p className="mt-2 text-sm text-white/55">Save a YouTube video or a hosted MP4. Use clip times to create separate exercise clips from a longer trainer video.</p>
    <div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm text-white/65 sm:col-span-2">Exercise / video name<input required minLength={2} maxLength={120} value={name} onChange={(e) => setName(e.target.value)} className={field} /></label>
      <label className="text-sm text-white/65 sm:col-span-2">YouTube or MP4 link<input required value={url} onChange={(e) => setUrl(e.target.value)} className={field} placeholder="https://youtu.be/..." /></label>
      <label className="text-sm text-white/65">Clip start (seconds)<input type="number" required min={0} max={86400} value={start} onChange={(e) => setStart(Number(e.target.value))} className={field} /></label>
      <label className="text-sm text-white/65">Clip end (optional)<input type="number" min={start + 1} max={86400} value={end} onChange={(e) => setEnd(e.target.value)} className={field} /></label>
      <label className="flex min-h-11 items-center gap-3 text-sm text-white/65 sm:col-span-2"><input type="checkbox" checked={crop} onChange={(e) => setCrop(e.target.checked)} />Remove black sidebars for portrait footage</label>
    </div><button disabled={saving} className="mt-5 min-h-12 rounded-2xl bg-zenith-500 px-5 font-bold text-slate-950 disabled:opacity-50">{saving ? "Saving video..." : "Save video"}</button>
    {message && <p role="status" className="mt-4 text-sm text-zenith-300">{message}</p>}
  </form>;
}
