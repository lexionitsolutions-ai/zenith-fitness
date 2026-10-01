"use client";

import { useState } from "react";
import { LoaderCircle, Phone } from "lucide-react";

export function MemberPhoneUpdate() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setBusy(true);
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch("/api/admin/member-phone", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        admissionId: data.get("admissionId"),
        mobile: data.get("mobile"),
      }),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(result.error?.message ?? "Unable to update mobile number.");
    form.reset();
    setMessage(`${result.data.fullName} (${result.data.admissionId}) can now sign in with ${result.data.mobileNumber}.`);
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-3xl border border-white/10 bg-white/[.04] p-5">
      <h2 className="flex items-center gap-2 text-xl font-bold"><Phone size={21} /> Update member mobile</h2>
      <input name="admissionId" required placeholder="Admission ID, e.g. ZF-202" className="w-full rounded-xl bg-black/20 p-3.5" />
      <input name="mobile" required inputMode="tel" placeholder="New mobile number" className="w-full rounded-xl bg-black/20 p-3.5" />
      <p className="text-xs text-white/45">This updates both the member profile and the login mobile number.</p>
      <button disabled={busy} className="flex min-h-12 w-full items-center justify-center rounded-xl bg-zenith-500 px-5 font-bold text-slate-950 disabled:opacity-60">
        {busy ? <LoaderCircle className="animate-spin" /> : "Update mobile number"}
      </button>
      {message && <p role="status" className="rounded-xl bg-white/10 p-3 text-sm text-white/75">{message}</p>}
    </form>
  );
}
