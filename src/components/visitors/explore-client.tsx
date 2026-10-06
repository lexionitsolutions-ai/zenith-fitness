"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, CalendarDays, Dumbbell, Play, UserRound } from "lucide-react";
import { PaymentCheckout, type PaymentOrder } from "./payment-checkout";
import { GymDetails } from "./gym-details";
import { membershipCategories, type MembershipCategory } from "@/constants/membership-packages";
import { membershipEndDate } from "@/lib/membership-dates";

type Plan = { id: string; planName: string; category: string | null; durationDays: number; standardPrice: string | null };
type Visitor = { fullName: string; mobileNumber: string; memberId: string | null };
type Order = PaymentOrder;
const videos = [
  { title: "Take a look around", copy: "Step inside Zenith Fitness and see where your next chapter begins.", src: "gym-tour", track: null },
  { title: "Build your strength", copy: "See our members in action on the strength training floor.", src: "strength-training", track: "strength-training" },
  { title: "Move together", copy: "Get a feel for functional training at Zenith Fitness.", src: "functional-training", track: "functional-training" },
];
const statuses: Record<string, string> = { PENDING: "Awaiting payment reference", SUBMITTED: "Payment under review", APPROVED: "Membership activated", REJECTED: "Payment not confirmed — contact the gym" };

export function ExploreClient({ plans, visitor, orders, today, unavailable }: { plans: Plan[]; visitor: Visitor | null; orders: Order[]; today: string; unavailable: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [authMessage, setAuthMessage] = useState("");
  const [enquiryMessage, setEnquiryMessage] = useState("");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [busy, setBusy] = useState("");
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [category, setCategory] = useState<MembershipCategory>("MALE");
  const selectedCategory = membershipCategories.find(c => c.code === category)!;
  const visiblePlans = plans.filter(p => p.category === category);
  const [startDate, setStartDate] = useState(today);
  async function send(url: string, body: unknown, method = "POST") {
    const r = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error?.message ?? "Unable to complete your request.");
    return data;
  }
  async function authenticate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const f = new FormData(e.currentTarget); setBusy("auth"); setAuthMessage("");
    try { await send("/api/visitors/auth", { mode, name: f.get("name") || undefined, mobile: f.get("mobile"), password: f.get("password") }); router.refresh(); }
    catch (e) { setAuthMessage(e instanceof Error ? e.message : "Please try again."); } finally { setBusy(""); }
  }
  async function enquire(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget; const f = new FormData(form); setBusy("enquiry"); setEnquiryMessage("");
    try { const data = await send("/api/enquiries", { name: f.get("name"), contact: f.get("contact"), trialDate: f.get("trialDate") }); setEnquiryMessage(data.message); form.reset(); }
    catch (e) { setEnquiryMessage(e instanceof Error ? e.message : "Please try again."); } finally { setBusy(""); }
  }
  async function checkout(planId: string) {
    if (!visitor) { setAuthMessage("Create a visitor account or sign in to buy a membership."); document.getElementById("visitor-account")?.scrollIntoView({ behavior: "smooth" }); return; }
    setBusy(planId); setPaymentMessage("");
    try { const data = await send("/api/payments", { planId, startDate }); setOrder(data.data); document.getElementById("checkout")?.scrollIntoView({ behavior: "smooth" }); }
    catch (e) { setPaymentMessage(e instanceof Error ? e.message : "Please try again."); } finally { setBusy(""); }
  }
  return <>
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#15251e] p-6 sm:p-10">
      <p className="text-xs font-bold uppercase tracking-[.25em] text-zenith-300">Your first step starts here</p><h1 className="mt-4 max-w-xl text-4xl font-black leading-tight sm:text-6xl">Find your strength.<br/><span className="text-zenith-300">Find your Zenith.</span></h1>
      <p className="mt-5 max-w-lg text-white/65">Explore the gym, see our training floor, and come experience Zenith Fitness for yourself.</p>
      <div className="mt-7 flex flex-wrap gap-3"><a href="#trial" className="visitor-button"><CalendarDays size={18}/>Book a trial</a><a href="#plans" className="visitor-secondary">View memberships<ArrowRight size={18}/></a></div>
      <div className="mt-8 flex flex-wrap gap-5 text-xs text-white/60"><span className="flex items-center gap-2"><Dumbbell size={16}/>Strength training</span><span className="flex items-center gap-2"><UserRound size={16}/>Functional training</span><span className="flex items-center gap-2"><Play size={16}/>A real look inside</span></div>
    </section>
    <GymDetails />
    <section className="mt-10"><p className="visitor-eyebrow">MEET YOUR GYM</p><h2 className="mt-2 text-2xl font-black">See the energy. Picture yourself here.</h2><div className="mt-5 grid gap-5 md:grid-cols-3">{videos.map(v => <article key={v.src} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[.04]"><video controls playsInline preload="metadata" aria-label={v.title} className="aspect-video w-full bg-black"><source src={`/gym/${v.src}.mp4`} type="video/mp4"/>{v.track && <track kind="descriptions" src={`/gym/${v.track}.vtt`} srcLang="en" label="English video description"/>}Your browser cannot play this video. <a href={`/gym/${v.src}.mp4`}>Download the gym video</a>.</video><div className="p-5"><h3 className="font-bold">{v.title}</h3><p className="mt-2 text-sm text-white/60">{v.copy}</p></div></article>)}</div></section>
    <div className="mt-10 grid gap-6 md:grid-cols-2">
      <section id="trial" className="visitor-card scroll-mt-6"><p className="visitor-eyebrow">COME SAY HELLO</p><h2 className="mt-2 text-2xl font-black">Try Zenith Fitness</h2><p className="mt-3 text-sm text-white/60">Share just three details. Our team will get in touch to confirm your visit.</p><form onSubmit={enquire} className="mt-6 space-y-4"><label className="visitor-label">Name<input className="visitor-input" name="name" autoComplete="name" minLength={2} maxLength={100} required defaultValue={visitor?.fullName}/></label><label className="visitor-label">Contact number<input className="visitor-input" name="contact" type="tel" inputMode="tel" autoComplete="tel" maxLength={30} required defaultValue={visitor?.mobileNumber}/></label><label className="visitor-label">Date you can come for a trial<input className="visitor-input" name="trialDate" type="date" min={today} required/></label><button disabled={busy === "enquiry"} className="visitor-button w-full">{busy === "enquiry" ? "Sending…" : "Send enquiry"}<ArrowRight size={18}/></button>{enquiryMessage && <p role="status" className="visitor-message">{enquiryMessage}</p>}</form></section>
      <section id="visitor-account" className="visitor-card scroll-mt-6"><p className="visitor-eyebrow">YOUR ZENITH JOURNEY</p>{visitor ? <><h2 className="mt-2 text-2xl font-black">Welcome, {visitor.fullName.split(" ")[0]}</h2><p className="mt-3 text-sm text-white/60">{visitor.mobileNumber}</p>{visitor.memberId ? <><p className="visitor-message mt-5">Your membership is active. Sign in with your number and the password you created here, then finish your member profile.</p><Link href="/login" className="visitor-button mt-5">Go to member login<ArrowRight size={18}/></Link></> : <p className="mt-5 text-sm text-white/60">Choose a membership below and pay directly to Zenith Fitness using UPI.</p>}<button type="button" className="visitor-secondary mt-5" onClick={async () => { await fetch("/api/visitors/auth", { method: "DELETE" }); setOrder(null); router.refresh(); }}>Sign out of visitor account</button></> : <><h2 className="mt-2 text-2xl font-black">{mode === "signup" ? "New to Zenith? Sign up." : "Visitor sign in"}</h2><div className="mt-5 flex gap-2" role="group" aria-label="Visitor account options">{(["signup", "login"] as const).map(m => <button type="button" key={m} onClick={() => { setMode(m); setAuthMessage(""); }} aria-pressed={mode === m} className={`min-h-11 flex-1 rounded-xl text-sm font-bold ${mode === m ? "bg-zenith-500 text-[#07110e]" : "bg-white/5"}`}>{m === "signup" ? "Create account" : "Sign in"}</button>)}</div><form key={mode} onSubmit={authenticate} className="mt-5 space-y-4">{mode === "signup" && <label className="visitor-label">Name<input name="name" className="visitor-input" autoComplete="name" minLength={2} maxLength={100} required/></label>}<label className="visitor-label">Mobile number<input name="mobile" className="visitor-input" type="tel" autoComplete="tel" maxLength={30} required/></label><label className="visitor-label">Password<input name="password" className="visitor-input" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={8} maxLength={128} required/><span className="mt-1 block text-xs text-white/40">At least 8 characters.</span></label><button disabled={busy === "auth"} className="visitor-button w-full">{busy === "auth" ? "Please wait…" : mode === "signup" ? "Create visitor account" : "Sign in"}</button>{authMessage && <p role="status" className="visitor-message">{authMessage}</p>}<p className="text-xs text-white/40">By creating an account, you agree to our <Link className="underline" href="/terms">terms</Link> and <Link className="underline" href="/privacy">privacy policy</Link>.</p></form></>}</section>
    </div>
    <section id="plans" className="mt-10 scroll-mt-6">
      <p className="visitor-eyebrow">MAKE IT YOUR ROUTINE</p>
      <h2 className="mt-2 text-2xl font-black">Choose your membership</h2>
      <p className="mt-3 text-sm text-white/60">All memberships include strength training, cardio, functional training, group batches and premium gym equipment. Pay directly with UPI; your membership starts once payment is verified.</p>
      <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Membership category">
        {membershipCategories.map(c => <button key={c.code} type="button" onClick={() => setCategory(c.code)} aria-pressed={category === c.code} className={`min-h-12 rounded-xl border px-4 py-3 text-sm font-bold ${category === c.code ? "border-zenith-400 bg-zenith-500 text-[#07110e]" : "border-white/10 bg-white/5 text-white"}`}>{c.label}</button>)}
      </div>
      <p className="visitor-message mt-4">{selectedCategory.note}</p>
      <label className="visitor-label mt-5 max-w-sm">Membership start date<input type="date" required min="1900-01-01" max={today} value={startDate} onChange={e => setStartDate(e.target.value)} className="visitor-input"/><span className="mt-2 block text-xs text-white/50">Choose today or earlier. The end date is calculated automatically.</span></label>
      {unavailable ? <p className="visitor-message mt-5">Membership details are temporarily unavailable. Please send a trial enquiry or try again later.</p> : <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {visiblePlans.map(plan => <article key={plan.id} className="visitor-card flex flex-col">
          <p className="text-xs text-white/50">{plan.durationDays} days of training</p>
          <h3 className="mt-2 text-xl font-bold">{plan.planName}</h3>
          <p className="my-5 text-3xl font-black text-zenith-300">{plan.standardPrice && Number(plan.standardPrice) > 0 ? `₹${Number(plan.standardPrice).toLocaleString("en-IN")}` : <span className="text-lg">Ask at the gym</span>}</p>
          <p className="mb-4 text-xs text-white/60">{plan.durationDays >= 90 ? "Includes a free diet plan" : "Free BMI checkup every 45 days"} · Free monthly steam sessions</p>
          <p className="mb-4 text-xs text-zenith-300">Ends: {startDate && /^\d{4}-\d{2}-\d{2}$/.test(startDate) ? membershipEndDate(startDate, plan.durationDays) : "Choose a start date"}</p>
          <button type="button" disabled={!!busy || !!visitor?.memberId || !plan.standardPrice || Number(plan.standardPrice) <= 0} onClick={() => checkout(plan.id)} className="visitor-button mt-auto w-full">{busy === plan.id ? "Preparing…" : plan.standardPrice && Number(plan.standardPrice) > 0 ? "Buy with UPI" : "Price coming soon"}</button>
        </article>)}
      </div>}
      {!unavailable && !visiblePlans.length && <p className="visitor-message mt-5">Plans for this category are currently unavailable. Send an enquiry to speak with our team.</p>}
      {paymentMessage && <p role="alert" className="visitor-message mt-4">{paymentMessage}</p>}
    </section>
    <div id="checkout" className="mt-8 max-w-lg scroll-mt-6">{order && <PaymentCheckout key={order.id} order={order} onClose={() => { setOrder(null); router.refresh(); }}/>}</div>
    {orders.length > 0 && <section className="mt-8"><h2 className="text-xl font-bold">Your membership orders</h2><div className="mt-4 space-y-3">{orders.map(o => <article key={o.id} className="visitor-card"><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-bold">{o.planName} · ₹{o.amount}</h3><p className="mt-2 text-sm text-zenith-300">{statuses[o.status] ?? o.status}</p></div>{["PENDING", "SUBMITTED"].includes(o.status) && <button type="button" onClick={() => setOrder(o)} className="visitor-secondary">{o.status === "PENDING" ? "Continue payment" : "View payment"}</button>}</div><p className="mt-3 break-all text-xs text-white/40">{o.reference}{o.utr ? ` · UTR ${o.utr}` : ""}</p></article>)}</div></section>}
  </>;
}
