"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Gift, Plus, Search, X } from "lucide-react";

type Member = { id: string; fullName: string; admissionId: string };

export function AwardPoints() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Member[]>([]);
  const [selected, setSelected] = useState<Member[]>([]);
  const [points, setPoints] = useState("");
  const [description, setDescription] = useState("");
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const searchVersion = useRef(0);
  const batchId = useRef<string | null>(null);
  const submitting = useRef(false);

  function changed() {
    batchId.current = null;
    setMessage("");
    setError("");
  }

  async function search(event: React.FormEvent) {
    event.preventDefault();
    const version = ++searchVersion.current;
    setSearching(true); setError(""); setSearched(false);
    try {
      const response = await fetch(`/api/admin/award-points?q=${encodeURIComponent(query.trim())}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "Could not search members.");
      if (version === searchVersion.current) { setResults(result.data); setSearched(true); }
    } catch (err) {
      if (version === searchVersion.current) setError(err instanceof Error ? err.message : "Could not search members.");
    } finally { if (version === searchVersion.current) setSearching(false); }
  }

  async function award(event: React.FormEvent) {
    event.preventDefault();
    if (submitting.current || !selected.length) return;
    submitting.current = true;
    setBusy(true); setError(""); setMessage("");
    try {
      batchId.current ??= crypto.randomUUID();
      const response = await fetch("/api/admin/award-points", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ batchId: batchId.current, memberIds: selected.map(member => member.id), points: Number(points), description }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "Could not award points. Retry this batch.");
      setMessage(`${points} points awarded to each of ${selected.length} selected members. The batch is complete.`);
      setSelected([]); batchId.current = null;
    } catch (err) { setError(err instanceof Error ? err.message : "Could not award points. Retry this batch."); }
    finally { setBusy(false); submitting.current = false; }
  }

  return (
    <main className="mx-auto min-h-dvh max-w-3xl px-5 py-8">
      <p className="text-sm text-zenith-400">ADMIN REWARDS</p>
      <h1 className="mt-1 flex items-center gap-3 text-3xl font-black"><Gift className="text-zenith-400" /> Award Points</h1>
      <p className="mt-3 text-sm text-white/60">Search for members and add them one by one. Award the same number of points to everyone in your selected list with one click.</p>
      <Link href="/admin/points" className="mt-3 inline-flex min-h-11 items-center text-sm text-zenith-300 underline underline-offset-4">View points ledger</Link>

      {error && <p role="alert" className="mt-4 rounded-xl bg-red-400/10 p-4 text-sm text-red-200">{error}</p>}
      {message && <p role="status" className="mt-4 rounded-xl bg-zenith-400/10 p-4 text-sm text-zenith-200">{message}</p>}

      <section className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-5">
        <h2 className="font-bold">Find members</h2>
        <form onSubmit={search} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="min-w-0 flex-1 text-sm text-white/65">Name, member ID, or mobile number
            <input value={query} onChange={event => { setQuery(event.target.value); ++searchVersion.current; setResults([]); setSearched(false); setSearching(false); }} required maxLength={100} disabled={busy} placeholder="e.g. ZF-2 or a member name" className="mt-2 w-full rounded-xl border border-white/15 bg-black/20 p-3 text-white" />
          </label>
          <button disabled={searching || busy || !query.trim()} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-zenith-400 px-4 font-bold text-black disabled:opacity-40"><Search size={18} />{searching ? "Searching..." : "Search"}</button>
        </form>
        <ul aria-label="Member search results" className="mt-4 max-h-80 space-y-2 overflow-y-auto">
          {results.map(member => {
            const added = selected.some(item => item.id === member.id);
            return <li key={member.id} className="flex items-center justify-between gap-3 rounded-xl bg-black/20 p-3">
              <div className="min-w-0"><p className="break-words font-bold">{member.fullName}</p><p className="text-sm text-white/50">{member.admissionId}</p></div>
              <button type="button" disabled={added || busy || selected.length >= 200} onClick={() => { changed(); setSelected(current => current.some(item => item.id === member.id) ? current : [...current, member]); }} aria-label={`Add ${member.fullName} (${member.admissionId})`} className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-xl border border-zenith-400/30 px-3 text-sm font-bold text-zenith-300 disabled:opacity-40"><Plus size={16} />{added ? "Added" : "Add"}</button>
            </li>;
          })}
        </ul>
        {searched && !results.length && <p className="mt-3 text-sm text-white/50">No members found. Try another name, ID, or mobile number.</p>}
        {results.length === 30 && <p className="mt-3 text-xs text-white/50">Showing the first 30 matches. Refine your search to find more members.</p>}
      </section>

      <form onSubmit={award} className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-5">
        <fieldset disabled={busy}>
          <legend className="font-bold">Selected members ({selected.length}/200)</legend>
          <ul aria-label="Selected members" className="mt-4 max-h-96 space-y-2 overflow-y-auto">
            {selected.map(member => <li key={member.id} className="flex items-center justify-between gap-3 rounded-xl bg-black/20 p-3"><div><p className="font-bold">{member.fullName}</p><p className="text-sm text-white/50">{member.admissionId}</p></div><button type="button" onClick={() => { changed(); setSelected(current => current.filter(item => item.id !== member.id)); }} aria-label={`Remove ${member.fullName} (${member.admissionId})`} className="flex min-h-11 min-w-11 items-center justify-center rounded-xl text-white/60"><X size={18} /></button></li>)}
          </ul>
          {!selected.length && <p className="mt-3 text-sm text-white/50">Add members from the search results above.</p>}
          <label className="mt-5 block text-sm text-white/65">Points per member
            <input type="number" required min={1} max={10000} step={1} value={points} onChange={event => { changed(); setPoints(event.target.value); }} className="mt-2 w-full rounded-xl border border-white/15 bg-black/20 p-3 text-white" />
          </label>
          <label className="mt-4 block text-sm text-white/65">Reason for award
            <textarea required minLength={3} maxLength={200} value={description} onChange={event => { changed(); setDescription(event.target.value); }} placeholder="e.g. Group challenge completed" className="mt-2 w-full rounded-xl border border-white/15 bg-black/20 p-3 text-white" />
          </label>
          <p className="mt-4 text-sm text-white/60">{selected.length} members × {Number(points) || 0} points = {(selected.length * (Number(points) || 0)).toLocaleString("en-IN")} total points</p>
          <button disabled={!selected.length || !Number.isInteger(Number(points)) || Number(points) < 1 || Number(points) > 10000 || description.trim().length < 3} className="mt-4 min-h-12 w-full rounded-xl bg-zenith-400 px-5 font-bold text-black disabled:opacity-40">{busy ? "Awarding points..." : `Award points to all ${selected.length} members`}</button>
        </fieldset>
      </form>
    </main>
  );
}
