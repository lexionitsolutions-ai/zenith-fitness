"use client";
import { useEffect, useState } from "react";
import { Database, RefreshCw } from "lucide-react";
type Batch = { id: string; status: string; totalRows: number; createdAt: string };
export default function ImportPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { fetch("/api/admin/import").then(r => r.json()).then(x => setBatches(x.data ?? [])).catch(() => setMessage("Could not load sync history.")); }, []);
  async function refresh() {
    setBusy(true);setMessage("");
    try {
      const r = await fetch("/api/admin/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ source: "supabase" }) });
      const x = await r.json();
      setMessage(r.ok ? `Verified ${x.data.members} members. Automatic updates are enabled.` : x.error?.message || "Could not verify membership sync.");
    } catch { setMessage("Could not reach the server. Please retry."); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto min-h-dvh max-w-5xl px-5 py-8">
    <p className="text-sm text-zenith-400">ZENITH OPERATIONS</p><h1 className="mt-1 text-3xl font-bold">Membership connection</h1>
    <section className="mt-8 rounded-2xl border border-zenith-400/30 bg-zenith-500/10 p-6">
      <div className="flex items-center gap-3 text-xl font-bold"><Database /> Supabase · Automatic updates</div>
      <p className="mt-3 text-white/70">Admissions, renewals, payments and member corrections update automatically from the membership manager. You no longer need to import Google Sheets.</p>
      <button disabled={busy} onClick={refresh} className="mt-5 flex min-h-12 items-center gap-3 rounded-xl bg-zenith-500 px-5 font-bold disabled:opacity-50"><RefreshCw className={busy ? "animate-spin" : ""} />{busy ? "Verifying…" : "Verify membership sync"}</button>
      {message && <p role="status" className="mt-4">{message}</p>}
    </section>
    <h2 className="mt-10 text-xl font-bold">Previous import history</h2>
    <div className="mt-4 space-y-3">{batches.map(b => <div key={b.id} className="rounded-xl border border-white/10 p-4">{new Date(b.createdAt).toLocaleString()} · {b.status} · {b.totalRows} rows</div>)}</div>
  </main>;
}
