"use client";
import Link from "next/link";
import { safeSessionStorage } from "@/lib/browser-storage";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Copy, MessageCircle, QrCode, ShieldCheck, Wallet } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { UpiPaymentMethods } from "./upi-payment-methods";
import { MembershipOverview, useMembershipOverview } from "./use-membership-overview";

const money = (value: number) => `₹${value.toLocaleString("en-IN")}`;

export function MembershipCheckout({ initial, orderId }: { initial: MembershipOverview; orderId: string }) {
  const router = useRouter();
  const { data, refresh } = useMembershipOverview(initial);
  const order = data.orders.find(o => o.id === orderId);
  const [showUtr, setShowUtr] = useState(false), [utr, setUtr] = useState("");
  const [app, setApp] = useState("Any UPI app"), [returned, setReturned] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [copied, setCopied] = useState(false);
  useEffect(() => {
    setUtr(safeSessionStorage.getItem(`zenith-utr:${orderId}`) ?? "");
    setShowUtr(safeSessionStorage.getItem(`zenith-paid:${orderId}`) === "1");
    setApp(safeSessionStorage.getItem(`zenith-upi-app:${orderId}`) ?? "Any UPI app");
    const onReturn = () => { if (document.visibilityState === "visible" && safeSessionStorage.getItem("zenith-upi-opened") === orderId) setReturned(true); };
    onReturn(); window.addEventListener("focus",onReturn); document.addEventListener("visibilitychange",onReturn);
    return () => { window.removeEventListener("focus",onReturn); document.removeEventListener("visibilitychange",onReturn); };
  }, [orderId]);
  if (!order) return <p role="alert" className="rounded-2xl bg-red-400/10 p-5">Checkout not found. <Link href="/membership" className="underline">View memberships</Link></p>;

  function openUpi(method: string) {
    if (!order) return;
    setApp(method); setReturned(true);
    safeSessionStorage.setItem(`zenith-upi-app:${orderId}`, method);
    safeSessionStorage.setItem("zenith-upi-opened",orderId);
    const url = method === "Google Pay" ? order.upiUrl.replace("upi://pay","gpay://upi/pay") : method === "PhonePe" ? order.upiUrl.replace("upi://pay","phonepe://pay") : method === "Paytm" ? order.upiUrl.replace("upi://pay","paytmmp://pay") : order.upiUrl;
    window.location.assign(url);
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/member/membership", { method:"PATCH", headers:{"content-type":"application/json"}, body:JSON.stringify({id:orderId,action:"submit",utr,paymentApp:app}) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message ?? "Unable to submit payment. Please retry.");
      safeSessionStorage.removeItem(`zenith-utr:${orderId}`); safeSessionStorage.removeItem(`zenith-paid:${orderId}`); safeSessionStorage.removeItem("zenith-upi-opened");
      await refresh().catch(() => {});
      if (result.data?.whatsappUrl) window.location.assign(result.data.whatsappUrl);
      else setError("Your payment details were saved. Refresh this page to open your WhatsApp request.");
    } catch (e) { setError(e instanceof Error ? e.message : "Connection interrupted. Your checkout is saved; please retry."); }
    finally { setBusy(false); }
  }
  async function cancel() {
    if (!confirm("Cancel only if no payment was made. If money was debited, submit the UTR or contact Zenith instead.")) return;
    setBusy(true); setError("");
    try {
      const res = await fetch("/api/member/membership",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({id:orderId,action:"cancel"})});
      const result = await res.json(); if (!res.ok) throw new Error(result.error?.message ?? "Unable to cancel checkout.");
      router.replace("/membership"); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Please try again."); setBusy(false); }
  }
  const submitted = order.status === "PENDING_REVIEW", approved = order.status === "APPROVED";
  const waiting = order.status === "AWAITING_PAYMENT";
  return <section className="space-y-6">
    <header><Link href="/membership#membership-plans" className="inline-flex min-h-11 items-center gap-2 text-sm text-white/60"><ArrowLeft size={16}/>{waiting ? "Change plan" : "Membership plans"}</Link><p className="mt-4 text-xs font-bold uppercase tracking-[.22em] text-zenith-300">{order.kind === "RENEWAL" ? "Renew your membership" : "Start your membership"}</p><h1 className="mt-2 text-3xl font-black">{approved ? "Membership approved" : submitted ? "Awaiting approval" : "Checkout"}</h1></header>
    <ol aria-label="Membership checkout progress" className="flex items-center gap-3 text-xs font-semibold text-white/45"><li className="flex items-center gap-1.5 text-zenith-300"><Check size={14}/>Plan selected</li><span aria-hidden="true" className="h-px flex-1 bg-white/15"/><li className={waiting ? "text-white" : "text-zenith-300"}>Payment</li><span aria-hidden="true" className="h-px flex-1 bg-white/15"/><li className={submitted || approved ? "text-zenith-300" : ""}>Approval</li></ol>
    <article className="overflow-hidden rounded-3xl border border-zenith-400/25 bg-white/[.04]">
      <div className="border-b border-white/10 bg-zenith-400/[.08] p-5 sm:p-6"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zenith-200"><ShieldCheck size={16}/>{approved ? "Approved" : submitted ? "Payment submitted" : "Your membership"}</div><h2 className="mt-3 text-2xl font-black">{order.planName}</h2><p className="mt-2 break-all text-xs text-white/35">Order {order.id}</p></div>
      <dl className="space-y-3 p-5 text-sm sm:p-6"><div className="flex justify-between"><dt>Plan duration</dt><dd>{order.durationMonths} month{order.durationMonths === 1 ? "" : "s"}</dd></div><div className="flex justify-between"><dt>Membership price</dt><dd>{money(order.price)}</dd></div>{order.pointsUsed > 0 && <div className="flex justify-between text-zenith-300"><dt>Points discount ({order.pointsUsed} points)</dt><dd>−{money(order.pointsUsed)}</dd></div>}<div className="flex justify-between border-t border-white/10 pt-4 text-xl font-black"><dt>{waiting ? "Total to pay" : "Payment amount"}</dt><dd>{money(order.amountDue)}</dd></div></dl>
    </article>
    {error && <p role="alert" className="rounded-2xl border border-red-300/20 bg-red-400/10 p-4 text-sm text-red-200">{error}</p>}
    {waiting && !showUtr && <article className="rounded-3xl border border-white/10 bg-white/[.03] p-5 sm:p-6">
      <div className="flex items-center gap-3"><span className="rounded-xl bg-zenith-400/10 p-2.5 text-zenith-300"><Wallet size={20}/></span><div><h2 className="font-bold">Choose a payment method</h2><p className="mt-1 text-xs text-white/50">Pay to {data.merchant.name}</p></div></div>
      <button type="button" disabled={busy} onClick={() => openUpi("Any UPI app")} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-zenith-400 px-3 text-sm font-bold text-black disabled:opacity-50"><Wallet size={18}/>Pay {money(order.amountDue)} with any UPI app<ArrowRight size={17}/></button>
      <UpiPaymentMethods selected={app} disabled={busy} onSelect={openUpi}/>
      <details open className="mt-5 rounded-2xl border border-white/10 bg-black/15 p-4"><summary className="cursor-pointer text-sm font-bold" onClick={() => { setApp("QR / manual transfer"); safeSessionStorage.setItem(`zenith-upi-app:${orderId}`,"QR / manual transfer"); }}><QrCode size={16} className="mr-2 inline"/>Scan QR / pay manually</summary><div className="mt-5 flex flex-col items-center"><div className="rounded-2xl bg-white p-4"><QRCodeSVG value={order.upiUrl} size={208} level="M" className="h-auto max-w-full" title={`Pay ${money(order.amountDue)} to ${data.merchant.name}`}/></div><p className="mt-4 text-sm font-bold">{data.merchant.name}</p><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(data.merchant.upiId); setCopied(true); } catch { setError("Copy the UPI ID shown below into your payment app."); } }} className="mt-2 inline-flex min-h-11 items-center gap-2 break-all text-xs text-zenith-200"><Copy size={14}/>{data.merchant.upiId}{copied && " · Copied"}</button><p className="mt-1 text-center text-xs leading-relaxed text-white/45">Scan from another phone, or use the UPI ID to pay the exact amount. Verify the recipient before paying.</p></div></details>
      {returned && <p role="status" className="mt-4 rounded-xl bg-amber-300/10 p-4 text-sm text-amber-200">Back from your UPI app? If payment succeeded, tap “I have paid.” If it failed or was cancelled, confirm no money was debited before retrying. Wait for a final status if your bank says pending.</p>}
      <div className="mt-6 border-t border-white/10 pt-5"><button type="button" onClick={() => { setShowUtr(true); safeSessionStorage.setItem(`zenith-paid:${orderId}`,"1"); }} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-4 font-bold text-black"><CheckCircle2 size={19}/>I have paid<ArrowRight size={17}/></button><p className="mt-2 text-center text-xs text-white/45">Next: enter your UTR and request approval on WhatsApp.</p></div>
      <button type="button" disabled={busy} onClick={() => void cancel()} className="mt-3 min-h-11 w-full text-sm text-white/40">Cancel unpaid checkout</button>
    </article>}
    {waiting && showUtr && <form onSubmit={submit} className="rounded-3xl border border-zenith-400/25 bg-white/[.04] p-5 sm:p-6"><p className="text-xs font-bold uppercase tracking-widest text-zenith-300">Payment details</p><h2 className="mt-2 text-2xl font-black">Enter your UTR</h2><p className="mt-3 text-sm leading-relaxed text-white/55">You’re confirming a payment of <b className="text-white">{money(order.amountDue)}</b> for {order.planName}. Find the 12-digit UPI reference on your payment receipt.</p><label className="mt-5 block text-sm font-medium">UTR / UPI reference number<input autoFocus value={utr} onChange={e => { const value = e.target.value.replace(/\D/g,"").slice(0,12); setUtr(value); safeSessionStorage.setItem(`zenith-utr:${orderId}`,value); }} required inputMode="numeric" autoComplete="off" pattern="[0-9]{12}" minLength={12} maxLength={12} placeholder="Enter 12-digit UTR" className="mt-2 w-full rounded-xl border border-white/15 bg-black/25 px-4 py-4 font-mono text-lg tracking-widest outline-none focus:border-zenith-400"/></label><button disabled={busy} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 font-bold text-[#07351a] disabled:opacity-50"><MessageCircle size={19}/>{busy ? "Saving payment…" : "Submit UTR & open WhatsApp"}</button><p className="mt-3 text-xs leading-relaxed text-white/45">Your plan, payment amount and UTR will be prefilled in a message to Zenith Fitness at 8999699811. Send it on WhatsApp to request {order.kind === "RENEWAL" ? "renewal" : "admission"} approval.</p><button type="button" disabled={busy} onClick={() => { setShowUtr(false); safeSessionStorage.removeItem(`zenith-paid:${orderId}`); }} className="mt-3 min-h-11 w-full text-sm text-white/50">Back to payment options</button></form>}
    {(submitted || approved) && <article className={`rounded-3xl border p-5 sm:p-6 ${approved ? "border-zenith-400/25 bg-zenith-400/10" : "border-amber-300/20 bg-amber-300/[.06]"}`}><CheckCircle2 className={approved ? "text-zenith-300" : "text-amber-200"}/><h2 className="mt-3 text-xl font-bold">{approved ? "Your membership is ready" : "Payment details saved"}</h2><p className="mt-3 text-sm leading-relaxed text-white/65">{approved ? "Your membership has been approved. Open Home to see your membership details." : "Send your prefilled WhatsApp request to Zenith Fitness. Your membership will be activated after admin verification. Please do not pay again."}</p><p className="mt-3 text-sm font-semibold">UTR: {order.utr}</p>{submitted && order.whatsappUrl && <a href={order.whatsappUrl} className="mt-5 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 font-bold text-[#07351a]"><MessageCircle size={18}/>Open WhatsApp request</a>}<Link href="/dashboard" className="mt-3 flex min-h-11 items-center justify-center text-sm text-white/65">Back to Home</Link></article>}
    {!waiting && !submitted && !approved && <article className="rounded-3xl border border-white/10 p-5"><h2 className="font-bold">{order.status === "REJECTED" ? "Payment not approved" : "Checkout cancelled"}</h2>{order.reviewNote && <p className="mt-3 text-sm text-white/65">{order.reviewNote}</p>}<p className="mt-3 text-sm text-white/55">If money was debited, contact Zenith Fitness to resolve the payment before paying again.</p><Link href="/membership" className="mt-4 inline-block text-zenith-200 underline">View memberships</Link></article>}
  </section>;
}
