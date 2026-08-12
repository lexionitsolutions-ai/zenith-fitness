"use client";

import { LoaderCircle, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Profile = { gender: string | null; birthDate: string | null; address: string | null; medicalHistory: string | null };

export function ProfileEditor({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/member/profile", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ gender: form.get("gender"), birthDate: form.get("birthDate") || null, address: form.get("address"), medicalHistory: form.get("medicalHistory") }) });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(result.error?.message ?? "Unable to update profile.");
    setMessage("Profile updated.");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="mt-5 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="gender" defaultValue={profile.gender ?? ""} placeholder="Gender" className="min-h-12 rounded-xl bg-black/20 p-3" />
        <input name="birthDate" type="date" defaultValue={profile.birthDate ?? ""} className="min-h-12 rounded-xl bg-black/20 p-3" />
      </div>
      <textarea name="address" defaultValue={profile.address ?? ""} placeholder="Address" className="min-h-24 w-full rounded-xl bg-black/20 p-3" />
      <textarea name="medicalHistory" defaultValue={profile.medicalHistory ?? ""} placeholder="Medical history or notes" className="min-h-24 w-full rounded-xl bg-black/20 p-3" />
      <button disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-zenith-500 px-5 font-bold text-slate-950 disabled:opacity-60">
        {busy ? <LoaderCircle className="animate-spin" /> : <><Save size={18} />Save profile</>}
      </button>
      {message && <p role="status" className="rounded-xl bg-white/10 p-3 text-sm text-white/70">{message}</p>}
    </form>
  );
}
