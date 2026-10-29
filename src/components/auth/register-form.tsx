"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (values.password !== values.confirmPassword) { setError("Passwords must match."); setBusy(false); return; }
    try {
      const res = await fetch("/api/auth/register", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(values) });
      const result = await res.json(); if (!res.ok) throw new Error(result.error?.message ?? "Unable to create account.");
      router.replace("/dashboard"); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Connection lost. Please try again."); }
    finally { setBusy(false); }
  }
  const field = "mt-2 w-full rounded-xl border border-white/15 bg-black/25 px-4 py-3 outline-none focus:border-zenith-400";
  return <form onSubmit={submit} className="mt-6 space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6">
    <label className="block text-sm">Full name<input name="name" required minLength={2} maxLength={120} autoComplete="name" className={field}/></label>
    <label className="block text-sm">Contact number<input name="mobile" required type="tel" maxLength={15} autoComplete="tel" placeholder="10-digit mobile number" className={field}/></label>
    <label className="block text-sm">Gender<select name="gender" required defaultValue="" className={field}><option value="" disabled>Select gender</option><option>Male</option><option>Female</option></select></label>
    <label className="block text-sm">Password<input name="password" required type="password" minLength={8} maxLength={128} pattern="(?=.*[A-Za-z])(?=.*[0-9]).{8,}" title="At least 8 characters, including a letter and a number" autoComplete="new-password" className={field}/><span className="mt-1 block text-xs text-white/50">At least 8 characters, including a letter and a number.</span></label>
    <label className="block text-sm">Confirm password<input name="confirmPassword" required type="password" minLength={8} maxLength={128} autoComplete="new-password" className={field}/></label>
    {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
    <button disabled={busy} className="min-h-12 w-full rounded-xl bg-zenith-400 font-bold text-black disabled:opacity-50">{busy ? "Creating account…" : "Create my account"}</button>
    <p className="text-xs leading-relaxed text-white/50">Explore workouts right away. Your admission ID and attendance QR are issued after your membership payment is approved.</p>
  </form>;
}
