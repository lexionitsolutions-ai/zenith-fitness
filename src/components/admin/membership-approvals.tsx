"use client";
import { useCallback, useEffect, useState } from "react";
type Order = {
  id: string; kind: string; planName: string; price: number; pointsUsed: number; amountDue: number;
  status: string; utr: string | null; reportedAmount: number | null; paymentApp: string | null;
  reviewNote: string | null; createdAt: string;
  user: { displayName: string | null; mobileNumber: string; applicantProfile: { gender: string; address: string | null; birthDate: string | null } | null; member: { admissionId: string; fullName: string; gender: string | null; address: string | null; birthDate: string | null } | null };
};
export function MembershipApprovals() {
  const [orders, setOrders] = useState<Order[]>([]), [tab, setTab] = useState("ADMISSION"), [history, setHistory] = useState(false);
  const [loading, setLoading] = useState(true), [error, setError] = useState("");
  const load = useCallback(async () => {
    const res = await fetch("/api/admin/memberships", { cache: "no-store" });
    const result = await res.json(); if (!res.ok) throw new Error(result.error?.message ?? "Unable to load requests.");
    setOrders(result.data); setLoading(false);
  }, []);
  useEffect(() => { void load().catch(e => { setError(e.message); setLoading(false); }); const timer = setInterval(() => void load().catch(() => {}), 30000); return () => clearInterval(timer); }, [load]);
  return <main className="mx-auto max-w-5xl px-4 py-8"><p className="text-xs font-bold uppercase tracking-widest text-zenith-300">Membership desk</p><h1 className="mt-2 text-3xl font-black">Admissions &amp; Renewals</h1><p className="mt-3 max-w-2xl text-sm text-white/55">Match the UTR, recipient and exact amount in the T B PATIL AND CO merchant account before approving. Approval creates the membership and issues an admission ID and attendance QR for new members.</p>
    <div className="mt-6 flex gap-2">{[{kind:"ADMISSION", label:"New admissions"},{kind:"RENEWAL", label:"Renewals"}].map(t => <button key={t.kind} onClick={() => setTab(t.kind)} className={`min-h-12 rounded-xl px-4 font-bold ${tab === t.kind ? "bg-zenith-400 text-black" : "bg-white/10"}`}>{t.label} <span className="ml-1 text-xs">{orders.filter(o => o.kind === t.kind && o.status === "PENDING_REVIEW").length}</span></button>)}</div>
    <label className="mt-5 flex items-center gap-2 text-sm text-white/60"><input type="checkbox" checked={history} onChange={e => setHistory(e.target.checked)}/>Include approved, rejected and unpaid requests</label>
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-400/10 p-4 text-red-200">{error}</p>}
    {loading && <p className="mt-8 text-white/50">Loading requests…</p>}
    {!loading && !orders.some(o => o.kind === tab && (history || o.status === "PENDING_REVIEW")) && <p className="mt-8 rounded-3xl border border-white/10 p-8 text-white/50">No {history ? "requests" : "payments awaiting review"} in this tab.</p>}
    <div className="mt-5 grid gap-4 md:grid-cols-2">{orders.filter(o => o.kind === tab && (history || o.status === "PENDING_REVIEW")).map(order => <ReviewCard key={order.id} order={order} onSave={load}/>)}</div>
  </main>;
}
function ReviewCard({ order: o, onSave }: { order: Order; onSave: () => Promise<void> }) {
  const [note, setNote] = useState(""), [verified, setVerified] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const profile = o.user.member ?? o.user.applicantProfile;
  async function review(decision: "approve" | "reject") {
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/admin/memberships", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: o.id, decision, note, verified }) });
      const result = await res.json(); if (!res.ok) throw new Error(result.error?.message ?? "Review failed.");
      await onSave();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save review. Refresh and retry."); }
    finally { setBusy(false); }
  }
  return <article className="rounded-3xl border border-white/10 bg-white/[.04] p-5"><div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-bold">{o.user.member?.fullName ?? o.user.displayName}</h2><a href={`tel:${o.user.mobileNumber}`} className="mt-1 block text-sm text-zenith-200">{o.user.mobileNumber}</a></div><span className="rounded-full bg-white/10 px-3 py-2 text-[10px] font-bold">{o.status.replaceAll("_", " ")}</span></div>
    <p className="mt-4 font-bold">{o.planName}</p><p className="mt-1 text-sm text-white/55">{o.user.member?.admissionId ?? "New applicant · no admission ID"} · {profile?.gender}</p><p className="mt-1 text-sm text-white/55">{profile?.address} · DOB {profile?.birthDate?.slice(0,10)}</p>
    <dl className="mt-4 space-y-2 rounded-2xl bg-black/20 p-4 text-sm"><div className="flex justify-between"><dt>Price</dt><dd>₹{o.price}</dd></div><div className="flex justify-between text-zenith-200"><dt>Points deducted</dt><dd>{o.status === "AWAITING_PAYMENT" || o.status === "CANCELLED" || o.status === "REJECTED" ? 0 : o.pointsUsed} {o.pointsUsed > 0 && o.status === "REJECTED" ? "(returned)" : ""}</dd></div><div className="flex justify-between font-bold"><dt>Expected payment</dt><dd>₹{o.amountDue}</dd></div><div className={`flex justify-between ${o.reportedAmount !== o.amountDue ? "text-amber-200" : ""}`}><dt>Member reports</dt><dd>₹{o.reportedAmount ?? "—"}</dd></div><div><dt className="text-white/45">UTR / method</dt><dd className="mt-1 break-all font-mono">{o.utr ?? "Not submitted"} · {o.paymentApp ?? "—"}</dd></div></dl>
    <p className="mt-3 break-all text-xs text-white/35">Order {o.id} · {new Date(o.createdAt).toLocaleDateString("en-IN", { timeZone:"Asia/Kolkata" })}</p>
    {o.reviewNote && <p className="mt-3 text-sm text-white/65">{o.reviewNote}</p>}
    {o.status === "PENDING_REVIEW" && <><label className="mt-4 block text-sm">Review / rejection note<textarea value={note} onChange={e => setNote(e.target.value)} maxLength={1000} placeholder="Required for rejection. Record any refund follow-up." className="mt-2 w-full rounded-xl border border-white/10 bg-black/20 p-3"/></label><label className="mt-3 flex items-start gap-2 text-sm text-white/65"><input type="checkbox" checked={verified} onChange={e => setVerified(e.target.checked)} className="mt-1"/>I verified this unique UTR, recipient and ₹{o.amountDue} credit against the merchant bank statement.</label>{o.reportedAmount !== o.amountDue && <p className="mt-3 text-sm text-amber-200">Amount mismatch. Resolve with the member before approval.</p>}
      <div className="mt-4 flex gap-3"><button disabled={busy || !verified || o.reportedAmount !== o.amountDue} onClick={() => void review("approve")} className="min-h-12 flex-1 rounded-xl bg-zenith-400 font-bold text-black disabled:opacity-40">{busy ? "Saving…" : "Approve membership"}</button><button disabled={busy || !note.trim()} onClick={() => void review("reject")} className="min-h-12 rounded-xl border border-red-300/30 px-4 font-bold text-red-200 disabled:opacity-40">Reject</button></div></>}
    {error && <p role="alert" className="mt-3 text-sm text-red-200">{error}</p>}
  </article>;
}
