"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { QRCodeSVG } from "qrcode.react";
import { ArrowRight, CheckCircle2, Copy, Smartphone, X } from "lucide-react";
import { UPI_ID } from "@/lib/visitor";

export type PaymentOrder = { id: string; amount: string; reference: string; status: string; planName: string; utr: string | null; upiUri: string; startDate?: string; endDate?: string };
const nativeUpi = registerPlugin<{ open(options: { uri: string; app: string }): Promise<void> }>("UpiPayments");
const apps = [
  { id: "gpay", label: "Google Pay", mark: "G", color: "bg-blue-50 text-blue-700", package: "com.google.android.apps.nbu.paisa.user" },
  { id: "phonepe", label: "PhonePe", mark: "पे", color: "bg-purple-50 text-purple-700", package: "com.phonepe.app" },
  { id: "paytm", label: "Paytm", mark: "paytm", color: "bg-sky-50 text-sky-700", package: "net.one97.paytm" },
];

export function PaymentCheckout({ order, onClose }: { order: PaymentOrder; onClose: () => void }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [utr, setUtr] = useState(order.utr ?? "");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(order.status !== "PENDING");
  async function openApp(id: string) {
    setMessage("");
    try {
      if (Capacitor.getPlatform() === "android") {
        await nativeUpi.open({ uri: order.upiUri, app: id });
      } else if (/Android/i.test(navigator.userAgent)) {
        const app = apps.find(a => a.id === id);
        window.location.href = `intent://pay?${order.upiUri.split("?")[1]}#Intent;scheme=upi;${app ? `package=${app.package};` : ""}end`;
      } else if (/iPhone|iPad|iPod/i.test(navigator.userAgent) && id === "gpay") {
        window.location.href = order.upiUri.replace("upi://", "gpay://upi/");
      } else {
        window.location.href = order.upiUri;
      }
      setMessage("Complete the payment in your UPI app, then return here and submit its 12-digit transaction reference. If the app does not open, use the QR code or copy our UPI ID.");
    } catch { setMessage("Unable to open that UPI app. Try All UPI apps, or scan the QR code below."); }
  }
  async function confirm(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("");
    try {
      const r = await fetch("/api/payments", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderId: order.id, utr }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error?.message ?? "Could not submit payment reference.");
      setSubmitted(true); router.refresh();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Please try again."); }
    finally { setBusy(false); }
  }
  return <section aria-label="UPI payment" className="rounded-3xl bg-[#f5f6f8] p-5 text-slate-900 shadow-2xl sm:p-7">
    <div className="flex items-center justify-between"><h2 className="text-xl font-black">Payment</h2><button type="button" aria-label="Close payment" onClick={onClose} className="rounded-xl p-3"><X /></button></div>
    <div className="my-5 rounded-2xl bg-white p-5"><p className="text-sm text-slate-500">{order.planName} · Zenith Fitness</p><p className="mt-1 text-3xl font-black">₹{Number(order.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p><p className="mt-2 break-all text-xs text-slate-500">Order: {order.reference}</p></div>
    {order.startDate && order.endDate && <p className="mb-5 text-sm text-slate-600">Starts {order.startDate} · Ends {order.endDate} (calculated by the gym system)</p>}
    {submitted ? <div role="status" className="rounded-2xl bg-emerald-50 p-5 text-emerald-900"><CheckCircle2 className="mb-3"/><h3 className="font-bold">Payment reference submitted</h3><p className="mt-2 text-sm">The gym will check receipt of your UPI payment and activate your membership. You can check the status on this page.</p></div> : <>
      <p className="mb-3 text-xs font-semibold tracking-widest text-slate-500">PAYMENT OPTIONS</p>
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-5 flex items-center justify-between font-bold"><span className="flex items-center gap-2"><Smartphone size={22}/>UPI</span><span>₹{order.amount}</span></div>
        <div className="grid grid-cols-3 gap-2">{apps.map(app => <button type="button" key={app.id} onClick={() => openApp(app.id)} className={`flex min-h-28 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 p-2 shadow-sm ${app.color}`}><span className="flex h-11 items-center justify-center text-xl font-black">{app.mark}</span><span className="text-xs font-bold">{app.label}</span></button>)}</div>
        <button type="button" onClick={() => openApp("all")} className="mt-4 flex min-h-12 w-full items-center justify-between rounded-xl border border-slate-300 px-4 font-semibold">All UPI apps<ArrowRight size={20}/></button>
        <p className="mt-3 text-xs text-slate-500">App selection depends on your phone and installed apps. On desktop, scan the QR with your phone.</p>
        <div className="my-5 flex items-center gap-3 text-xs text-slate-400"><hr className="flex-1"/>OR SCAN TO PAY<hr className="flex-1"/></div>
        <div className="flex justify-center"><QRCodeSVG value={order.upiUri} size={192} marginSize={4} title={`Pay Zenith Fitness ₹${order.amount}`}/></div>
        <p className="text-center text-xs text-slate-500">Amount and gym UPI ID are included in this QR.</p>
        <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(UPI_ID); setMessage("Gym UPI ID copied. If paying manually, enter the amount and order reference shown above."); } catch { setMessage(`Copy this UPI ID: ${UPI_ID}`); } }} className="mt-4 flex min-h-12 w-full items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 text-xs font-semibold"><span className="break-all">{UPI_ID}</span><Copy size={16}/></button>
      </div>
      <form onSubmit={confirm} className="mt-5"><label className="text-sm font-semibold">Paid already? Add your UPI transaction reference<input value={utr} onChange={e => setUtr(e.target.value)} required pattern="[0-9]{12}" maxLength={12} inputMode="numeric" placeholder="12-digit UTR from your UPI receipt" className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4"/></label><button disabled={busy} className="mt-3 min-h-12 w-full rounded-xl bg-slate-900 px-4 font-bold text-white disabled:opacity-50">{busy ? "Submitting…" : "Submit for payment verification"}</button><p className="mt-3 text-xs text-slate-500">The gym activates your selected membership period after confirming payment and approving the request. Opening a UPI app does not confirm payment.</p></form>
    </>}
    {message && <p role="status" className="mt-4 rounded-xl bg-white p-4 text-sm text-slate-600">{message}</p>}
  </section>;
}
