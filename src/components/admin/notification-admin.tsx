"use client";

import { LoaderCircle, Send } from "lucide-react";
import { useState } from "react";

export function NotificationAdmin() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/notifications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ audience: form.get("audience"), title: form.get("title"), body: form.get("body"), sendNow: true }) });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(result.error?.message ?? "Unable to send notification.");
    setMessage(`Queued ${result.data.queued} device notifications for ${result.data.users} users. Sent ${result.data.sent?.sent ?? 0}, failed ${result.data.sent?.failed ?? 0}, skipped ${result.data.sent?.skipped ?? 0}.${result.data.warning ? ` ${result.data.warning}` : ""}`);
    event.currentTarget.reset();
  }

  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-5 py-8">
      <p className="text-sm text-zenith-400">ADMIN NOTIFICATIONS</p>
      <h1 className="text-3xl font-black">Send notification</h1>
      <form onSubmit={submit} className="mt-7 space-y-4 rounded-3xl border border-white/10 bg-white/[.04] p-5">
        <select name="audience" required defaultValue="MEMBERS" className="min-h-12 w-full rounded-xl bg-black/20 p-3">
          <option value="MEMBERS">Members</option>
          <option value="STAFF">Staff</option>
          <option value="ALL">Members and staff</option>
        </select>
        <input name="title" required maxLength={120} placeholder="Notification title" className="min-h-12 w-full rounded-xl bg-black/20 p-3" />
        <textarea name="body" required maxLength={500} placeholder="Message" className="min-h-32 w-full rounded-xl bg-black/20 p-3" />
        <button disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-zenith-500 px-5 font-bold text-slate-950 disabled:opacity-60">
          {busy ? <LoaderCircle className="animate-spin" /> : <><Send size={18} />Send notification</>}
        </button>
        {message && <p role="status" className="rounded-xl bg-white/10 p-3 text-sm text-white/75">{message}</p>}
      </form>
    </main>
  );
}
