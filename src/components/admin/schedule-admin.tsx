"use client";

import { LoaderCircle, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

type Row = { id: string; day: number; time: string; name: string };
const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function ScheduleAdmin({ initial }: { initial: Row[] }) {
  const [rows, setRows] = useState(initial);
  const [editing, setEditing] = useState<Row | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/schedule", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: editing?.id, day: form.get("day"), time: form.get("time"), name: form.get("name") }) });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(result.error?.message ?? "Unable to save schedule.");
    setRows((current) => [...current.filter((row) => row.id !== result.data.id), result.data].sort((a, b) => a.day - b.day || a.time.localeCompare(b.time)));
    setEditing(null);
    event.currentTarget.reset();
    setMessage("Schedule saved.");
  }

  async function remove(id: string) {
    const response = await fetch(`/api/admin/schedule?id=${id}`, { method: "DELETE" });
    if (response.ok) setRows((current) => current.filter((row) => row.id !== id));
  }

  return (
    <main className="mx-auto min-h-dvh max-w-4xl px-5 py-8">
      <p className="text-sm text-zenith-400">ADMIN SCHEDULE</p>
      <h1 className="text-3xl font-black">Functional schedule</h1>
      <form onSubmit={submit} className="mt-7 grid gap-3 rounded-3xl border border-white/10 bg-white/[.04] p-5 sm:grid-cols-[1fr_10rem_1fr_auto]">
        <select name="day" required defaultValue={editing?.day ?? 1} key={`day-${editing?.id ?? "new"}`} className="min-h-12 rounded-xl bg-black/20 p-3">
          {dayNames.map((day, index) => <option key={day} value={index}>{day}</option>)}
        </select>
        <input name="time" required type="time" defaultValue={editing?.time ?? ""} key={`time-${editing?.id ?? "new"}`} className="min-h-12 rounded-xl bg-black/20 p-3" />
        <input name="name" required placeholder="Class name" defaultValue={editing?.name ?? ""} key={`name-${editing?.id ?? "new"}`} className="min-h-12 rounded-xl bg-black/20 p-3" />
        <button disabled={busy} className="flex min-h-12 items-center justify-center rounded-xl bg-zenith-500 px-5 font-bold text-slate-950 disabled:opacity-60">{busy ? <LoaderCircle className="animate-spin" /> : editing ? "Update" : "Add"}</button>
      </form>
      {message && <p className="mt-4 rounded-xl bg-white/10 p-3 text-sm">{message}</p>}
      <section className="mt-7 space-y-3">
        {rows.map((row) => (
          <article key={row.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white/[.04] p-4">
            <div><b>{row.name}</b><p className="text-sm text-white/45">{dayNames[row.day]} · {row.time}</p></div>
            <div className="flex gap-2">
              <button onClick={() => setEditing(row)} className="rounded-xl bg-white/10 p-3" aria-label="Edit schedule"><Pencil size={18} /></button>
              <button onClick={() => remove(row.id)} className="rounded-xl bg-red-500/10 p-3 text-red-200" aria-label="Remove schedule"><Trash2 size={18} /></button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
