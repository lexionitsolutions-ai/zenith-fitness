"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Gift, Plus, X } from "lucide-react";

import { DAILY_VISIT_POINTS } from "@/lib/utils/point-rules";

type Member = { id: string; fullName: string; admissionId: string };

export function AwardPoints() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Member[]>([]);
  const [selected, setSelected] = useState<Member[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [searchError, setSearchError] = useState("");
  const submitting = useRef(false);

  function changed() {
    setMessage("");
    setError("");
  }

  useEffect(() => {
    const term = query.trim();
    const controller = new AbortController();
    let active = true;
    setResults([]); setSearched(false); setSearchError("");
    if (!term) { setSearching(false); return; }
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/admin/award-points?q=${encodeURIComponent(term)}`, { cache: "no-store", signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error?.message ?? "Could not search members.");
        if (active) { setResults(result.data); setSearched(true); }
      } catch (err) {
        if (active) setSearchError(err instanceof Error ? err.message : "Could not search members.");
      } finally { if (active) setSearching(false); }
    }, 250);
    return () => { active = false; clearTimeout(timer); controller.abort(); };
  }, [query]);

  async function award(event: React.FormEvent) {
    event.preventDefault();
    if (submitting.current || !selected.length) return;
    submitting.current = true;
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/award-points", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ memberIds: selected.map(member => member.id) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "Could not award points. Retry this batch.");
      const { awardedCount, alreadyAwardedCount, points } = result.data;
      setMessage(`Daily attendance recorded for ${awardedCount} members (+${points} points each). ${alreadyAwardedCount} members already received today's daily points and were skipped.`);
      setSelected([]);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not award points. Retry this batch."); }
    finally { setBusy(false); submitting.current = false; }
  }

  return (
    <main className="mx-auto min-h-dvh max-w-3xl px-5 py-8">
      <p className="text-sm text-zenith-400">ADMIN DAILY ATTENDANCE</p>
      <h1 className="mt-1 flex items-center gap-3 text-3xl font-black"><Gift className="text-zenith-400" /> Award Points</h1>
      <p className="mt-3 text-sm text-white/60">Verify members' Instagram or WhatsApp attendance photos, then add their names below. Record today's attendance for everyone selected in one click.</p>
      <Link href="/admin/points" className="mt-3 inline-flex min-h-11 items-center text-sm text-zenith-300 underline underline-offset-4">View points ledger</Link>

      {error && <p role="alert" className="mt-4 rounded-xl bg-red-400/10 p-4 text-sm text-red-200">{error}</p>}
      {message && <p role="status" className="mt-4 rounded-xl bg-zenith-400/10 p-4 text-sm text-zenith-200">{message}</p>}

      <section className="mt-5 rounded-3xl border border-white/10 bg-white/5 p-5">
        <h2 className="font-bold">Find members</h2>
        <label className="mt-4 block text-sm text-white/65">Name, member ID, or mobile number
          <input value={query} onChange={event => setQuery(event.target.value)} maxLength={100} disabled={busy} autoComplete="off" aria-describedby="member-search-hint" placeholder="Start typing a name, e.g. Sha" className="mt-2 w-full rounded-xl border border-white/15 bg-black/20 p-3 text-white" />
        </label>
        <p id="member-search-hint" className="mt-2 text-xs text-white/50">Matching names and member IDs appear as you type. Add each member whose photo you verified.</p>
        {searching && <p role="status" className="mt-3 text-sm text-white/50">Finding members...</p>}
        {searchError && <p role="alert" className="mt-3 text-sm text-red-200">{searchError}</p>}
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
          <p className="mt-5 rounded-xl bg-zenith-400/10 p-4 text-sm text-zenith-200">Daily attendance: {DAILY_VISIT_POINTS} points per member. Members who already received today's daily points through a QR check-in or photo attendance are skipped automatically. Attendance also counts toward their streak.</p>
          <button disabled={!selected.length} className="mt-4 min-h-12 w-full rounded-xl bg-zenith-400 px-5 font-bold text-black disabled:opacity-40">{busy ? "Recording attendance..." : `Record today's attendance for ${selected.length} members`}</button>
        </fieldset>
      </form>
    </main>
  );
}
