"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, Sparkles, Ticket } from "lucide-react";
import { useRouter } from "next/navigation";
import { MEMBERSHIP_PLANS, renewalDiscount } from "@/lib/membership-plans";
import { MembershipOverview, useMembershipOverview } from "./use-membership-overview";

const money = (n:number) => `₹${n.toLocaleString("en-IN")}`;
const field = "mt-2 w-full rounded-xl border border-white/15 bg-black/25 px-4 py-3 outline-none focus:border-zenith-400";
const labels:Record<string,string> = { AWAITING_PAYMENT:"Awaiting payment",PENDING_REVIEW:"Payment under review",APPROVED:"Membership approved",REJECTED:"Payment not approved",CANCELLED:"Checkout cancelled" };

export function MembershipShop({ initial }: { initial:MembershipOverview }) {
  const router = useRouter();
  const { data, refresh } = useMembershipOverview(initial);
  const [category,setCategory] = useState(["male","m"].includes(initial.gender.toLowerCase()) ? "MALE" : "FEMALE");
  const [busy,setBusy] = useState(false), [error,setError] = useState(""), [message,setMessage] = useState("");
  const active = data.orders.find(order => ["AWAITING_PAYMENT","PENDING_REVIEW"].includes(order.status));
  const isFemale = ["female","f"].includes(data.gender.toLowerCase());
  const categories = isFemale ? [{key:"FEMALE",name:"All-day access"},{key:"FEMALE_HAPPY",name:"Happy Hours"}] : [{key:"MALE",name:"Male membership"}];

  async function saveProfile(event:React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setMessage("");
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch("/api/member/applicant-profile",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(values)});
      const result = await response.json(); if (!response.ok) throw new Error(result.error?.message ?? "Unable to save details.");
      await refresh(); setMessage("Profile saved. Choose your membership below.");
    } catch (e) { setError(e instanceof Error ? e.message : "Connection interrupted. Please retry."); }
    finally { setBusy(false); }
  }
  async function choosePlan(planCode:string) {
    const switching = active?.status === "AWAITING_PAYMENT" && active.planCode !== planCode;
    if (switching && !confirm("Change your plan? Continue only if you have not paid for the current checkout. The unpaid checkout will be cancelled and the new plan price and eligible points discount will be applied.")) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/member/membership",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({planCode,replaceExisting:Boolean(switching)})});
      const result = await response.json(); if (!response.ok) throw new Error(result.error?.message ?? "Unable to start checkout.");
      router.push(result.data.checkoutUrl);
    } catch (e) { setError(e instanceof Error ? e.message : "Connection interrupted. Refresh to resume your saved checkout."); }
    finally { setBusy(false); }
  }

  return <section className="space-y-6">
    <header><p className="text-xs font-bold uppercase tracking-[.22em] text-zenith-300">Invest in yourself</p><h1 className="mt-2 text-3xl font-black">{data.isMember ? "Renew Membership" : "Buy Membership"}</h1><p className="mt-2 text-sm text-white/55">{data.isMember ? "Keep your momentum. Your new plan starts after your current membership ends." : "Choose your plan and take the next step at Zenith Fitness."}</p></header>
    {(!data.address || !data.birthDate || !data.isMember) && <form onSubmit={saveProfile} className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <h2 className="font-bold">Your details</h2><p className="mt-1 text-sm text-white/50">{data.name} · {data.mobile} · {data.gender}</p>
      <label className="mt-4 block text-sm">Address / locality<textarea name="address" required minLength={5} maxLength={500} defaultValue={data.address} className={field}/></label>
      <label className="mt-4 block text-sm">Birth date<input name="birthDate" type="date" required min="1900-01-01" max={new Date().toLocaleDateString("en-CA",{timeZone:"Asia/Kolkata"})} defaultValue={data.birthDate} className={field}/></label>
      <button disabled={busy} className="mt-4 min-h-11 rounded-xl bg-white/10 px-5 font-bold disabled:opacity-50">Save details</button>
    </form>}
    {error && <p role="alert" className="rounded-2xl border border-red-400/25 bg-red-400/10 p-4 text-sm text-red-200">{error}</p>}
    {message && <p role="status" className="rounded-2xl bg-zenith-400/10 p-4 text-sm text-zenith-200">{message}</p>}
    {active && <article className="rounded-3xl border border-zenith-400/30 bg-zenith-400/[.08] p-5 sm:p-6"><p className="text-xs font-bold uppercase tracking-widest text-zenith-200">{labels[active.status]}</p><h2 className="mt-2 text-xl font-black">{active.planName}</h2><p className="mt-2 text-sm text-white/60">{active.status === "PENDING_REVIEW" ? "Your payment details are saved. Open your request to send the WhatsApp message or check approval status." : "Your checkout is saved. Continue to pay using a UPI app or QR code, or choose a different plan below."}</p><Link href={`/membership/checkout/${active.id}`} className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl bg-zenith-400 px-5 font-bold text-black">{active.status === "PENDING_REVIEW" ? "View payment request" : "Continue to payment"}<ArrowRight size={18}/></Link>{active.status === "AWAITING_PAYMENT" && <a href="#membership-plans" className="ml-4 mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-zenith-200 underline underline-offset-4">Change plan</a>}</article>}
    <>
      <div id="membership-plans" className="scroll-mt-8"><h2 className="text-xl font-bold">{active ? "Explore other plans" : "Choose your plan"}</h2>{active?.status === "AWAITING_PAYMENT" && <p className="mt-2 text-sm text-white/55">You can switch to any eligible plan below before paying.</p>}{active?.status === "PENDING_REVIEW" && <p className="mt-2 text-sm text-amber-200">Your payment is under review. Contact Zenith if you want to change the submitted plan.</p>}</div>
      {data.isMember && <div className="flex items-center gap-3 rounded-2xl border border-zenith-400/20 bg-zenith-400/10 p-4"><Ticket className="text-zenith-300"/><div><b>{data.points} points available</b><p className="text-xs text-white/55">1 point = ₹1. Maximum eligible points are applied automatically.</p></div></div>}
      <div className="flex gap-2 rounded-2xl bg-white/5 p-1.5">{categories.map(c => <button key={c.key} onClick={() => setCategory(c.key)} className={`min-h-11 flex-1 rounded-xl px-3 text-sm font-bold ${category === c.key ? "bg-zenith-400 text-black" : "text-white/60"}`}>{c.name}</button>)}</div>
      {category === "FEMALE_HAPPY" && <p className="text-sm text-amber-200">Happy Hours: 10 AM–4 PM, exclusively for females. Points discounts do not apply.</p>}
      <div className="grid gap-4 sm:grid-cols-2">{MEMBERSHIP_PLANS.filter(plan => plan.category === category).map(plan => {
        const discount = data.isMember ? renewalDiscount(data.points,plan.discountCap,plan.price) : 0;
        return <article key={plan.code} className={`relative flex flex-col rounded-3xl border p-5 ${plan.months === 12 ? "border-zenith-400/40 bg-gradient-to-br from-zenith-400/15 to-white/[.03]" : "border-white/10 bg-white/[.04]"}`}>
          {active?.planCode === plan.code && <p className="mb-3 text-xs font-bold uppercase tracking-widest text-zenith-300">Currently selected</p>}
          {plan.months === 12 && <p className="mb-3 flex items-center gap-1 text-xs font-bold text-zenith-300"><Sparkles size={14}/>BEST VALUE</p>}
          <h2 className="text-xl font-black">{plan.months === 12 ? "1 Year" : `${plan.months} Month${plan.months > 1 ? "s" : ""}`}</h2><p className="mt-1 text-xs text-white/45">{plan.label}</p>
          <p className="mt-4 text-3xl font-black">{money(plan.price-discount)}</p>{discount > 0 && <p className="mt-1 text-xs text-zenith-300"><span className="mr-2 text-white/40 line-through">{money(plan.price)}</span>{discount} points saved</p>}
          <ul className="my-5 flex-1 space-y-2 text-sm text-white/65">{["Strength + cardio + group batches","45-day BMI checkup","Monthly steam sessions",...(plan.dietIncluded ? ["FREE diet plan"] : [])].map(text => <li key={text} className="flex items-center gap-2"><Check size={14} className="shrink-0 text-zenith-300"/>{text}</li>)}</ul>
          {data.isMember && <p className="mb-3 text-xs text-white/45">{plan.discountCap ? `Up to ${plan.discountCap} points discount` : "No points discount on Happy Hours"}</p>}
          <button disabled={busy || !data.address || !data.birthDate || active?.status === "PENDING_REVIEW"} onClick={() => void choosePlan(plan.code)} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-zenith-400 px-4 font-bold text-black disabled:opacity-40">{busy ? "Please wait…" : active?.planCode === plan.code ? "Continue with this plan" : active?.status === "AWAITING_PAYMENT" ? "Switch to this plan" : "Choose plan"}<ArrowRight size={17}/></button>
        </article>;
      })}</div>{(!data.address || !data.birthDate) && <p className="text-sm text-amber-200">Save your address and birth date above to continue.</p>}
    </>
    {data.orders.some(order => !["AWAITING_PAYMENT","PENDING_REVIEW"].includes(order.status)) && <details className="rounded-2xl border border-white/10 p-4"><summary className="cursor-pointer font-bold">Your membership requests</summary><div className="mt-4 space-y-3">{data.orders.filter(order => !["AWAITING_PAYMENT","PENDING_REVIEW"].includes(order.status)).map(order => <Link key={order.id} href={`/membership/checkout/${order.id}`} className="block rounded-xl bg-white/5 p-4 text-sm"><b>{order.planName}</b><p className={order.status === "APPROVED" ? "mt-1 text-zenith-300" : "mt-1 text-white/60"}>{labels[order.status]} · {money(order.amountDue)}</p>{order.reviewNote && <p className="mt-2 text-white/65">{order.reviewNote}</p>}</Link>)}</div></details>}
    <footer className="rounded-3xl border border-white/10 bg-white/[.03] p-5 text-sm text-white/60"><h2 className="font-bold text-white">Visit Zenith Fitness</h2><p className="mt-2">Behind ITI College, Hanuman Nagar, Pachgaon Road, Kolhapur.</p><p className="mt-3">Mon–Sat: 6 AM–11 PM<br/>Sunday: 6:30–10 AM &amp; 5–9 PM</p><p className="mt-3 text-zenith-200">FREE one-day trial available</p><div className="mt-4 flex gap-4"><a href="tel:9272112745" className="underline">9272112745</a><a href="https://www.instagram.com/zenithfitness360" target="_blank" rel="noreferrer" className="underline">Instagram</a></div></footer>
  </section>;
}
