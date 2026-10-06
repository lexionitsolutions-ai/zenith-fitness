"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
type Plan = { id: string; planName: string; standardPrice: string | null; isActive: boolean };
type Enquiry = { id: string; name: string; contact: string; trialDate: string; status: string };
type Order = { id: string; planName: string; reference: string; amount: string; utr: string | null; status: string; kind: string; startDate: string | null; endDate: string | null; customer: { fullName: string; mobileNumber: string; admissionId: string | null } };
type Job = { id: string; key: string; kind: string; status: string; lastError: string | null; name: string; attempts: number };
export function JoiningAdmin({ plans, enquiries, orders, jobs }: { plans: Plan[]; enquiries: Enquiry[]; orders: Order[]; jobs: Job[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [missingChecked, setMissingChecked] = useState<string | null>(null);
  async function update(body: unknown) {
    setBusy(true); setMessage("");
    try {
      const r = await fetch("/api/admin/joining", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error?.message ?? "Could not save.");
      setMessage(data.sheetsStatus ? data.sheetsStatus === "SYNCED" ? "Saved and synchronized with reception Sheets." : `Saved in the app. Sheets status: ${data.sheetsStatus}. Review the synchronization section below.` : "Saved.");
      setReviewId(null); setMissingChecked(null); router.refresh();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Please try again."); }
    finally { setBusy(false); }
  }
  return <div className="mt-6 space-y-8">
    {message && <p role="status" className="visitor-message">{message}</p>}
    <section><h2 className="text-xl font-bold">UPI admissions & renewal approval</h2><p className="mt-2 text-sm text-white/60">Verify the exact amount and UTR in the gym’s bank or UPI statement. Approval activates the selected membership dates and submits the entry to reception Sheets. End dates are system generated.</p>
      <div className="mt-4 space-y-3">{!orders.length && <p className="visitor-message">No membership requests yet.</p>}{orders.map(o => <article key={o.id} className="visitor-card">
        <p className="visitor-eyebrow">{o.kind === "RENEWAL" ? "EXISTING MEMBER RENEWAL" : "NEW ADMISSION"} · {o.status}</p>
        <h3 className="mt-2 font-bold">{o.customer.fullName} · {o.planName}</h3><p className="mt-2 text-sm text-white/60">{o.customer.mobileNumber} · ₹{o.amount}{o.customer.admissionId ? ` · ${o.customer.admissionId}` : ""}</p>
        <p className="mt-3 text-sm">Start: {o.startDate ?? "Approval date (legacy request)"} · End: {o.endDate ?? "Calculated at approval"}</p>
        <p className="mt-3 break-all text-xs text-white/50">Order: {o.reference}</p><p className="mt-2 text-sm font-semibold">UTR: {o.utr ?? "Not submitted yet"}</p>
        {["PENDING", "SUBMITTED"].includes(o.status) && <div className="mt-4 flex flex-wrap gap-3"><button type="button" disabled={busy || o.status !== "SUBMITTED"} onClick={() => setReviewId(o.id)} className="visitor-button">Review & approve</button><button type="button" disabled={busy} onClick={() => update({ action: "review", id: o.id, approve: false })} className="visitor-secondary">Reject / cancel order</button></div>}
        {reviewId === o.id && <div className="visitor-message mt-4"><p>I have verified receipt of ₹{o.amount} with UTR {o.utr}, checked the selected start date, and approve this {o.kind.toLowerCase()}.</p><button type="button" disabled={busy} onClick={() => update({ action: "review", id: o.id, approve: true })} className="visitor-button mt-3">Confirm payment, approve & push to Sheets</button><button type="button" onClick={() => setReviewId(null)} className="ml-3 text-sm underline">Back</button></div>}
      </article>)}</div>
    </section>
    <section><h2 className="text-xl font-bold">Reception Sheets synchronization</h2><p className="mt-2 text-sm text-white/60">Admissions, renewals and enquiries use the existing reception script. A saved entry is never automatically sent twice. Uncertain writes need a sheet check before resending.</p>
      <div className="mt-4 space-y-3">{!jobs.length && <p className="visitor-message">No sheet submissions yet.</p>}{jobs.map(j => <article key={j.id} className="visitor-card"><h3 className="font-bold">{j.name} · {j.kind}</h3><p className="mt-2 text-sm text-zenith-300">{j.status === "SAVED" ? "Saved in Sheets; admission ID / row reconciliation pending" : j.status}</p><p className="mt-2 break-all text-xs text-white/40">{j.key} · Attempts: {j.attempts}</p>{j.lastError && <p className="mt-3 text-sm text-amber-200">{j.lastError}</p>}
        {j.status !== "SYNCED" && <button type="button" disabled={busy} onClick={() => update({ action: "sync", id: j.id })} className="visitor-secondary mt-4">{j.status === "SAVED" || j.status === "UNCERTAIN" ? "Check / reconcile Sheets entry" : "Retry synchronization"}</button>}
        {j.status === "UNCERTAIN" && <div className="mt-4 border-t border-white/10 pt-4"><label className="flex items-start gap-3 text-sm text-white/65"><input type="checkbox" className="mt-1" checked={missingChecked === j.id} onChange={e => setMissingChecked(e.target.checked ? j.id : null)}/>I checked the destination sheet and confirmed this entry is missing. Resending an existing entry can create a duplicate.</label><button type="button" disabled={busy || missingChecked !== j.id} className="visitor-button mt-3" onClick={() => update({ action: "sync", id: j.id, confirmedMissing: true })}>Resend confirmed missing entry</button></div>}
      </article>)}</div>
    </section>
    <section><h2 className="text-xl font-bold">Trial enquiries</h2><div className="mt-4 space-y-3">{!enquiries.length && <p className="visitor-message">No trial enquiries yet.</p>}{enquiries.map(e => <article key={e.id} className="visitor-card"><h3 className="font-bold">{e.name}</h3><p className="mt-2 text-sm text-white/65">{e.contact} · Trial: {e.trialDate}</p><label className="visitor-label mt-3">Status<select value={e.status} disabled={busy} onChange={ev => update({ action: "enquiry", id: e.id, status: ev.target.value })} className="visitor-input"><option value="NEW">New</option><option value="CONTACTED">Contacted</option><option value="COMPLETED">Completed</option></select></label></article>)}</div></section>
    <section><h2 className="text-xl font-bold">Online membership prices</h2><p className="mt-2 text-sm text-white/60">Only active plans with a price can be purchased. Existing orders keep their original price.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{plans.map(p => <form key={`${p.id}-${p.standardPrice}-${p.isActive}`} className="visitor-card space-y-3" onSubmit={e => { e.preventDefault(); const f = new FormData(e.currentTarget); void update({ action: "price", planId: p.id, price: f.get("price"), isActive: f.get("active") === "on" }); }}><h3 className="font-bold">{p.planName}</h3><label className="visitor-label">Price (₹)<input name="price" type="number" min="0.01" max="99999999.99" step="0.01" required defaultValue={p.standardPrice ?? ""} className="visitor-input"/></label><label className="flex items-center gap-2 text-sm"><input name="active" type="checkbox" defaultChecked={p.isActive}/>Available to buy</label><button disabled={busy} className="visitor-button">Save plan</button></form>)}</div></section>
  </div>;
}
