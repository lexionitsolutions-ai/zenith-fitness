"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { QRCodeSVG } from "qrcode.react";
import { ArrowRight, CheckCircle2, Copy, Download, Smartphone, X } from "lucide-react";
import { UPI_ID, UPI_PAYEE, upiUri } from "@/lib/renewals";

export type PaymentOrder = { id: string; amount: string; reference: string; status: string; planName: string; utr: string | null; upiUri: string; startDate?: string | null; endDate?: string | null };
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
  const [submitted, setSubmitted] = useState(order.status !== "DRAFT");
  const qrRef = useRef<HTMLDivElement>(null);
  // Rebuild every handoff from the ICICI account configuration, including
  // checkouts resumed from older response data.
  const paymentUri = upiUri(order.amount, order.reference);
  async function saveQr() {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" }));
    try {
      const picture = new Image();
      picture.src = url;
      await picture.decode();
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 768;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Unable to save QR.");
      ctx.fillStyle = "#ffffff";
      ctx.imageSmoothingEnabled = false;
      ctx.fillRect(0, 0, 768, 768);
      ctx.drawImage(picture, 0, 0, 768, 768);
      const link = document.createElement("a");
      link.download = `zenith-icici-${order.reference}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      setMessage("QR saved. Open your UPI app's scanner and select this image from your gallery. Confirm the ICICI UPI ID and amount before paying.");
    } catch {
      setMessage("If your phone cannot save this QR, take a screenshot and select it from your UPI app's scanner, or copy the UPI ID below.");
    } finally { URL.revokeObjectURL(url); }
  }
  async function openApp(id: string) {
    setMessage("");
    if (!Capacitor.isNativePlatform() && !/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      setMessage("Scan the QR with any UPI app on your phone, or copy the UPI ID and pay the exact amount shown above.");
      return;
    }
    try {
      if (Capacitor.getPlatform() === "android") {
        if (Capacitor.isPluginAvailable("UpiPayments")) {
          await nativeUpi.open({ uri: paymentUri, app: id });
        } else {
          // Older APKs can still use Capacitor's external ACTION_VIEW handler.
          // intent:// is a Chrome protocol and is not handled by that bridge.
          window.location.href = paymentUri;
          setMessage("Choose your UPI app to pay. If no app opens, update Zenith Fitness or copy the UPI ID below. Return here after payment to submit its 12-digit transaction reference.");
          return;
        }
      } else if (/Android/i.test(navigator.userAgent)) {
        const app = apps.find(a => a.id === id);
        window.location.href = `intent://pay?${paymentUri.split("?")[1]}#Intent;scheme=upi;${app ? `package=${app.package};` : ""}end`;
      } else if (/iPhone|iPad|iPod/i.test(navigator.userAgent) && id === "gpay") {
        window.location.href = paymentUri.replace("upi://", "gpay://upi/");
      } else {
        window.location.href = paymentUri;
      }
      setMessage("Complete the payment in your UPI app, then return here and submit its 12-digit transaction reference. If the app does not open, use the QR code or copy our UPI ID.");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unable to open that UPI app.";
      setMessage(`${detail} Try All UPI apps, or copy the UPI ID below and pay from your payment app.`);
    }
  }
  async function confirm(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage("");
    try {
      const r = await fetch("/api/renewals", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: order.id, utr }) });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error?.message ?? "Could not submit payment reference.");
      setSubmitted(true); router.refresh();
    } catch (e) { setMessage(e instanceof Error ? e.message : "Please try again."); }
    finally { setBusy(false); }
  }
  return <section aria-label="UPI payment" className="rounded-3xl border border-white/10 bg-[#10201b] p-5 text-white shadow-2xl sm:p-7">
    <div className="flex items-center justify-between"><h2 className="text-xl font-black">Complete your renewal</h2><button type="button" aria-label="Close payment" onClick={() => { router.refresh(); onClose(); }} className="rounded-xl p-3"><X /></button></div>
    <div className="my-5 rounded-2xl bg-white/[.05] p-5"><p className="text-sm text-white/50">{order.planName} · Zenith Fitness</p><p className="mt-1 text-3xl font-black">₹{Number(order.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</p><p className="mt-2 break-all text-xs text-white/50">Order: {order.reference}</p></div>
    {order.startDate && order.endDate && <p className="mb-5 text-sm text-white/70">Starts {order.startDate} · Ends {order.endDate} (calculated by the gym system)</p>}
    {submitted ? <div role="status" className="rounded-2xl bg-emerald-50 p-5 text-emerald-900"><CheckCircle2 className="mb-3"/><h3 className="font-bold">Sent for approval</h3><p className="mt-2 text-sm">Your payment reference is with the admin. Your membership renews after the payment is checked and approved.</p></div> : <>
      <p className="mb-3 text-xs font-semibold tracking-widest text-white/50">PAYMENT OPTIONS</p>
      <div className="rounded-2xl border border-white/10 bg-white/[.05] p-4">
        <div className="mb-5 rounded-xl border border-zenith-400/20 bg-zenith-400/[.07] p-4"><p className="text-xs font-bold uppercase tracking-widest text-zenith-400">Pay to ICICI Bank · HUF account</p><p className="mt-2 break-all text-sm font-bold">{UPI_ID}</p><p className="mt-1 text-xs text-white/60">{UPI_PAYEE}</p><p className="mt-2 text-xs text-white/50">Confirm this UPI ID is displayed in Google Pay, PhonePe or your chosen app before paying.</p></div>
        <div className="mb-5 flex items-center justify-between font-bold"><span className="flex items-center gap-2"><Smartphone size={22}/>UPI</span><span>₹{order.amount}</span></div>
        <div className="grid grid-cols-3 gap-2">{apps.map(app => <button type="button" key={app.id} onClick={() => openApp(app.id)} className={`flex min-h-28 flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 p-2 shadow-sm ${app.color}`}><span className="flex h-11 items-center justify-center text-xl font-black">{app.mark}</span><span className="text-xs font-bold">{app.label}</span></button>)}</div>
        <button type="button" onClick={() => openApp("all")} className="mt-4 flex min-h-12 w-full items-center justify-between rounded-xl border border-white/15 px-4 font-semibold">All UPI apps<ArrowRight size={20}/></button>
        <p className="mt-3 text-xs text-white/50">App selection depends on your phone and installed apps. On desktop, scan the QR with your phone.</p>
        <div className="my-5 flex items-center gap-3 text-xs text-white/40"><hr className="flex-1"/>OR SCAN TO PAY<hr className="flex-1"/></div>
        <div ref={qrRef} className="flex justify-center"><QRCodeSVG value={paymentUri} size={224} marginSize={4} bgColor="#ffffff" fgColor="#10201b" level="M" title={`Pay Zenith Fitness ₹${order.amount} to ${UPI_ID}`}/></div>
        <p className="mt-3 text-center text-xs text-white/50">ICICI Bank · {UPI_PAYEE}</p><p className="mt-1 text-center text-xs text-white/50">Open any UPI app's scanner and scan this QR. The amount is included.</p>
        <button type="button" onClick={saveQr} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-3 text-sm font-semibold"><Download size={17}/> Save QR to scan from gallery</button>
        <button type="button" onClick={async () => { try { await navigator.clipboard.writeText(UPI_ID); setMessage("Gym UPI ID copied. If paying manually, enter the amount and order reference shown above."); } catch { setMessage(`Copy this UPI ID: ${UPI_ID}`); } }} className="mt-4 flex min-h-12 w-full items-center justify-between gap-2 rounded-xl bg-black/20 px-3 text-xs font-semibold"><span className="break-all">{UPI_ID}</span><Copy size={16}/></button>
      </div>
      <form onSubmit={confirm} className="mt-5"><label className="text-sm font-semibold">Paid already? Add your UPI transaction reference<input value={utr} onChange={e => setUtr(e.target.value)} required pattern="[0-9]{12}" maxLength={12} inputMode="numeric" placeholder="12-digit UTR from your UPI receipt" className="mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-white/[.05] px-4"/></label><button disabled={busy} className="mt-3 min-h-12 w-full rounded-xl bg-zenith-400 px-4 font-bold text-black disabled:opacity-50">{busy ? "Submitting…" : "Submit for payment verification"}</button><p className="mt-3 text-xs text-white/50">Submit only after a successful payment. Admin will verify receipt with ICICI Bank before approval. Never share your UPI PIN here.</p></form>
    </>}
    {message && <p role="status" className="mt-4 rounded-xl bg-white/[.05] p-4 text-sm text-white/70">{message}</p>}
  </section>;
}
