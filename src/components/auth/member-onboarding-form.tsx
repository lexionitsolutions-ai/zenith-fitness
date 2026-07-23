"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, KeyRound, LoaderCircle } from "lucide-react";

export function MemberOnboardingForm({
  needsPassword,
  needsBirthDate,
}: {
  needsPassword: boolean;
  needsBirthDate: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirmation = String(form.get("confirmation") || "");
    if (needsPassword && password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    const response = await fetch("/api/member/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        password: needsPassword ? password : undefined,
        birthDate: needsBirthDate ? form.get("birthDate") : undefined,
      }),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) {
      setError(result.error?.message ?? "Unable to save your details.");
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-7 space-y-5 rounded-3xl border border-white/10 bg-white/[.06] p-6 shadow-2xl">
      {needsPassword && (
        <fieldset className="space-y-4">
          <legend className="flex items-center gap-2 font-bold"><KeyRound size={19} /> Create your password</legend>
          <p className="text-sm text-white/55">Use at least 8 characters, including a letter and a number. Do not reuse the temporary password.</p>
          <input name="password" type="password" minLength={8} maxLength={128} autoComplete="new-password" required placeholder="New password" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 outline-none focus:border-zenith-400" />
          <input name="confirmation" type="password" minLength={8} maxLength={128} autoComplete="new-password" required placeholder="Confirm new password" className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 outline-none focus:border-zenith-400" />
        </fieldset>
      )}
      {needsBirthDate && (
        <label className="block font-bold">
          <span className="flex items-center gap-2"><CalendarDays size={19} /> Your birth date</span>
          <span className="mt-2 block text-sm font-normal text-white/55">This is missing from your membership profile. Please enter it carefully.</span>
          <input name="birthDate" type="date" min="1900-01-01" max={new Date().toISOString().slice(0, 10)} required className="mt-3 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3.5 outline-none focus:border-zenith-400" />
        </label>
      )}
      {error && <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
      <button disabled={busy} className="flex min-h-12 w-full items-center justify-center rounded-xl bg-zenith-500 font-bold text-[#07110e] disabled:opacity-60">
        {busy ? <LoaderCircle className="animate-spin" /> : "Save and continue"}
      </button>
    </form>
  );
}
