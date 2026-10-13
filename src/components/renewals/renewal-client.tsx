"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, Check, CheckCircle2, Clock3, ShieldCheck, Sparkles } from "lucide-react";
import { membershipPackages, membershipCategories } from "@/constants/membership-packages";
import { PaymentCheckout, type PaymentOrder } from "./payment-checkout";
export type RenewalHistory = PaymentOrder & { rejectionReason: string | null; startDate: string | null; endDate: string | null; createdAt: string };
const money = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
const date = (s: string | null) => s ? new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "Not available";
export function RenewalClient({ name, admissionId, gender, currentEnd, history }: { name: string; admissionId: string; gender: string | null; currentEnd: string | null; history: RenewalHistory[] }) {
  const router = useRouter();
  const female = /^female$/i.test(gender?.trim() ?? "");
  const [category, setCategory] = useState(female ? "FEMALE" : "MALE");
  const [selected, setSelected] = useState(female ? "FEMALE_90_DAYS" : "MALE_90_DAYS");
  const open = history.find(h => ["DRAFT", "SUBMITTED"].includes(h.status));
  useEffect(() => {
    if (open?.status !== "SUBMITTED") return;
    const timer = setInterval(() => { if (!document.hidden) router.refresh(); }, 30000);
    return () => clearInterval(timer);
  }, [open?.status, router]);
  const [checkout, setCheckout] = useState<PaymentOrder | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const plan = membershipPackages.find(p => p.planCode === selected)!;
  async function pay() {
    setBusy(true); setMessage("");
    try { const r = await fetch("/api/renewals", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ planCode: selected }) }); const d = await r.json(); if (!r.ok) throw new Error(d.error?.message ?? "Unable to start checkout."); setCheckout(d.data); router.refresh(); } catch (e) { setMessage(e instanceof Error ? e.message : "Try again."); } finally { setBusy(false); }
  }
  async function cancel() {
    if (!open || !confirm("Cancel this unpaid checkout? If you have paid, submit your transaction reference instead.")) return;
    setBusy(true); setMessage("");
    try { const r = await fetch("/api/renewals", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: open.id }) }); const d = await r.json(); if (!r.ok) throw new Error(d.error?.message ?? "Unable to cancel."); router.refresh(); } catch (e) { setMessage(e instanceof Error ? e.message : "Try again."); } finally { setBusy(false); }
  }
  return <main className="safe-bottom mx-auto min-h-dvh max-w-5xl px-4 pb-28 pt-6 sm:px-8">
    <Link href="/dashboard" className="inline-flex min-h-11 items-center gap-2 text-sm text-white/60"><ArrowLeft size={17}/> Back to dashboard</Link>
    <header className="relative mt-5 overflow-hidden rounded-3xl border border-zenith-400/20 bg-gradient-to-br from-zenith-500/20 to-transparent p-6 sm:p-8">
      <Sparkles className="absolute right-6 top-6 text-zenith-400/30" size={44}/><p className="text-xs font-bold uppercase tracking-[.2em] text-zenith-400">KEEP YOUR MOMENTUM</p>
      <h1 className="mt-3 text-3xl font-black sm:text-4xl">Your next chapter<br/>starts here.</h1><p className="mt-3 max-w-md text-sm text-white/60">Renew your Zenith Fitness membership in a few taps. Pay directly to the gym with UPI.</p>
      <div className="mt-6 flex flex-wrap gap-3 text-xs"><span className="rounded-full border border-white/10 bg-black/15 px-3 py-2">{name} · {admissionId}</span><span className="rounded-full border border-white/10 bg-black/15 px-3 py-2">Current plan ends {date(currentEnd)}</span></div>
    </header>
    {checkout ? <div className="mt-6"><PaymentCheckout key={checkout.id} order={checkout} onClose={() => setCheckout(null)}/></div> : <>
    {open ? <section className="mt-6 rounded-3xl border border-amber-300/25 bg-amber-300/[.06] p-6"><Clock3 className="text-amber-200"/><h2 className="mt-3 text-xl font-bold">{open.status === "SUBMITTED" ? "Your renewal is awaiting approval" : "You have a checkout in progress"}</h2><p className="mt-2 text-sm text-white/60">{open.planName} · {money(Number(open.amount))}</p>{open.status === "SUBMITTED" ? <p className="mt-3 text-sm text-white/60">Reference {open.utr}. Admin will verify your payment and approve your renewal.</p> : <div className="mt-4 flex flex-wrap gap-3"><button onClick={() => setCheckout(open)} className="min-h-12 rounded-xl bg-zenith-400 px-5 font-bold text-black">Continue payment</button><button disabled={busy} onClick={cancel} className="min-h-12 rounded-xl border border-white/15 px-5 text-sm">Cancel unpaid checkout</button></div>}</section> : <section className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs uppercase tracking-widest text-white/45">01 / CHOOSE YOUR PLAN</p><h2 className="mt-2 text-2xl font-bold">Make consistency a habit.</h2></div>{female && <div role="group" aria-label="Membership category" className="flex rounded-xl border border-white/10 p-1">{membershipCategories.filter(c => c.code !== "MALE").map(c => <button key={c.code} onClick={() => { setCategory(c.code); setSelected(`${c.code}_90_DAYS`); }} className={`min-h-11 rounded-lg px-3 text-xs font-bold ${category === c.code ? "bg-zenith-400 text-black" : "text-white/60"}`}>{c.label}</button>)}</div>}</div>
      {category === "FEMALE_HAPPY_HOURS" && <p className="mt-3 text-sm text-amber-200">Happy Hours access: 10 AM–4 PM during gym opening hours.</p>}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{membershipPackages.filter(p => p.category === category).map(p => <button key={p.planCode} aria-pressed={selected === p.planCode} onClick={() => setSelected(p.planCode)} className={`relative min-h-48 rounded-3xl border p-5 text-left transition-colors ${selected === p.planCode ? "border-zenith-400 bg-zenith-400/10" : "border-white/10 bg-white/[.03] hover:border-white/30"}`}><span className={`absolute right-4 top-4 flex h-5 w-5 items-center justify-center rounded-full border ${selected === p.planCode ? "border-zenith-400 bg-zenith-400 text-black" : "border-white/25"}`}>{selected === p.planCode && <Check size={14}/>}</span><p className="text-xs font-bold uppercase tracking-widest text-white/45">{p.durationDays === 90 ? "BUILD A ROUTINE" : p.durationDays === 365 ? "GO ALL IN" : p.durationDays === 180 ? "STAY COMMITTED" : "GET STARTED"}</p><h3 className="mt-5 text-xl font-black">{p.durationDays === 365 ? "1 Year" : `${p.durationDays / 30} Month${p.durationDays > 30 ? "s" : ""}`}</h3><p className="mt-3 text-2xl font-black text-zenith-400">{money(p.standardPrice)}</p><p className="mt-2 text-xs text-white/45">{p.durationDays} days · one-time payment</p></button>)}</div>
      <div className="mt-5 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[.04] p-6 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm text-white/55">{plan.planName}</p><p className="mt-1 text-3xl font-black">{money(plan.standardPrice)}<span className="ml-2 text-xs font-normal text-white/45">total payable</span></p></div><button disabled={busy} onClick={pay} className="flex min-h-14 items-center justify-center gap-3 rounded-2xl bg-zenith-400 px-7 font-bold text-black disabled:opacity-50">{busy ? "Preparing checkout..." : "Continue to UPI payment"}<ArrowUpRight size={20}/></button></div>
      <p className="mt-4 text-sm text-white/50">Early renewal preserves your remaining paid days. Expired memberships restart on approval. Final dates appear after approval.</p>
    </section>}
    <div className="mt-7 grid gap-3 text-sm text-white/60 sm:grid-cols-3">{[[ShieldCheck,"Pay directly to ICICI Bank"],[Clock3,"Verified by your gym admin"],[CheckCircle2,"Renewal saved to gym records"]].map(([Icon,label]) => { const I=Icon as typeof ShieldCheck; return <div key={String(label)} className="flex items-center gap-3 rounded-2xl border border-white/10 p-4"><I className="shrink-0 text-zenith-400" size={21}/><span>{String(label)}</span></div>; })}</div>
    </>}
    {message && <p role="alert" className="mt-5 rounded-2xl bg-red-400/10 p-4 text-sm text-red-200">{message}</p>}
    {history.filter(h => !["DRAFT","CANCELLED"].includes(h.status)).length > 0 && <section className="mt-9"><h2 className="text-lg font-bold">Renewal history</h2><div className="mt-4 space-y-3">{history.filter(h => !["DRAFT","CANCELLED"].includes(h.status)).map(h => <article key={h.id} className="rounded-2xl border border-white/10 p-5"><div className="flex flex-wrap justify-between gap-3"><b>{h.planName}</b><span className={`text-xs font-bold ${h.status === "APPROVED" ? "text-zenith-400" : h.status === "REJECTED" ? "text-red-300" : "text-amber-200"}`}>{h.status === "SUBMITTED" ? "AWAITING APPROVAL" : h.status}</span></div><p className="mt-2 text-sm text-white/50">{money(Number(h.amount))} · {h.reference}</p>{h.status === "APPROVED" && <p className="mt-2 text-sm text-zenith-400">{date(h.startDate)} · {date(h.endDate)}</p>}{h.rejectionReason && <p className="mt-2 text-sm text-red-200">{h.rejectionReason} Contact reception to resolve your payment.</p>}</article>)}</div></section>}
  </main>;
}
