"use client";

import { useCallback, useState } from "react";
import { ScanLine, Search, Target } from "lucide-react";
import { QrScanner } from "./qr-scanner";

type Member = {
  id: string;
  admissionId: string;
  fullName: string;
  mobileNumber: string | null;
  targets: { id: string; title: string; dueDate: string; rewardPoints: number }[];
};

export function StaffConsole() {
  const [token, setToken] = useState("");
  const [query, setQuery] = useState("");
  const [member, setMember] = useState<Member | null>(null);
  const [message, setMessage] = useState("");

  const scan = useCallback(async (value?: string) => {
    const qr = (value ?? token).trim();
    if (!qr) return;
    const response = await fetch("/api/staff/scan", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ qrToken: qr }) });
    const payload = await response.json();
    setMessage(response.ok ? (payload.data.alreadyAwarded ? "Daily points already awarded" : `5 points awarded to ${payload.data.member.name}`) : payload.error?.message);
  }, [token]);

  async function search() {
    const response = await fetch(`/api/staff/member?q=${encodeURIComponent(query)}`);
    const payload = await response.json();
    setMember(response.ok ? payload.data : null);
    setMessage(response.ok ? "" : payload.error?.message);
  }

  async function assign(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!member) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const body = {
      memberId: member.id,
      title: form.get("title"),
      description: form.get("description") || undefined,
      rewardPoints: Number(form.get("rewardPoints")),
      startDate: form.get("startDate"),
      dueDate: form.get("dueDate"),
    };
    const response = await fetch("/api/staff/targets", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const payload = await response.json();
    setMessage(response.ok ? `Target assigned with a ${payload.data.rewardPoints}-point reward` : payload.error?.message);
    if (response.ok) {
      formElement.reset();
      await search();
    }
  }

  async function complete(target: { id: string; rewardPoints: number }) {
    const response = await fetch("/api/staff/targets", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ targetId: target.id }) });
    const payload = await response.json();
    setMessage(response.ok ? `Target completed - ${target.rewardPoints} points awarded` : payload.error?.message);
    if (response.ok) await search();
  }

  return <main className="mx-auto min-h-dvh max-w-4xl px-5 py-8">
    <p className="text-sm text-zenith-400">ZENITH STAFF</p>
    <h1 className="text-3xl font-black">Member activity</h1>
    <div className="mt-8 grid gap-5 md:grid-cols-2">
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h2 className="flex gap-2 font-bold"><ScanLine />Award daily visit</h2>
        <p className="mt-2 text-sm text-white/50">Scan the member QR. Only 5 visit points can be awarded per Indian calendar day.</p>
        <QrScanner onScan={scan} />
        <input value={token} onChange={(event) => setToken(event.target.value)} placeholder="Or enter QR token" className="mt-4 w-full rounded-xl bg-black/20 p-3" />
        <button onClick={() => scan()} className="mt-3 min-h-12 w-full rounded-xl bg-zenith-500 font-bold">Award 5 points</button>
      </section>
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h2 className="flex gap-2 font-bold"><Search />Find member</h2>
        <div className="mt-5 flex gap-2">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Admission ID or mobile" className="min-w-0 flex-1 rounded-xl bg-black/20 p-3" />
          <button onClick={search} className="rounded-xl bg-white/10 px-4">Search</button>
        </div>
        {member && <>
          <div className="mt-5">
            <b>{member.fullName}</b> - {member.admissionId}
            {member.targets.map((target) => <div key={target.id} className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-black/20 p-3 text-sm">
              <span>{target.title}<small className="block text-white/40">Due {new Date(target.dueDate).toLocaleDateString("en-IN")} - +{target.rewardPoints} points</small></span>
              <button onClick={() => complete(target)} className="rounded-lg bg-zenith-500 px-3 py-2">Complete +{target.rewardPoints}</button>
            </div>)}
          </div>
          <form onSubmit={assign} className="mt-5 space-y-3">
            <h3 className="flex gap-2 font-bold"><Target size={18} />Assign target</h3>
            <input name="title" required placeholder="Target title" className="w-full rounded-xl bg-black/20 p-3" />
            <textarea name="description" placeholder="Description" className="w-full rounded-xl bg-black/20 p-3" />
            <input name="rewardPoints" type="number" min="1" max="10000" required placeholder="Reward points" className="w-full rounded-xl bg-black/20 p-3" />
            <div className="grid grid-cols-2 gap-2">
              <input name="startDate" type="date" required className="rounded-xl bg-black/20 p-3" />
              <input name="dueDate" type="date" required className="rounded-xl bg-black/20 p-3" />
            </div>
            <button className="min-h-12 w-full rounded-xl bg-zenith-500 font-bold">Assign target</button>
          </form>
        </>}
      </section>
    </div>
    {message && <p className="mt-5 rounded-xl bg-white/10 p-4">{message}</p>}
  </main>;
}
