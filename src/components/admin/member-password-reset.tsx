"use client";

import { LoaderCircle, KeyRound } from "lucide-react";
import { useState } from "react";

type ResetRequest = {
  id: string;
  createdAt: string;
  requestedByMobile: string;
  user: {
    member: {
      fullName: string;
      admissionId: string;
      mobileNumber: string | null;
    } | null;
  };
};

export function MemberPasswordReset({ initialRequests = [] }: { initialRequests?: ResetRequest[] }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [requests, setRequests] = useState(initialRequests);

  async function submit(event: React.FormEvent<HTMLFormElement>, requestId?: string) {
    event.preventDefault();
    setMessage("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/member-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        q: form.get("q"),
        password: form.get("password"),
        requestId,
      }),
    });
    const result = await response.json();
    setBusy(false);
    setMessage(response.ok ? `${result.data.message} Ask them to sign in with it and create their own new password.` : result.error?.message ?? "Unable to reset password.");
    if (response.ok) {
      event.currentTarget.reset();
      if (requestId) setRequests((rows) => rows.filter((row) => row.id !== requestId));
    }
  }

  return (
    <div className="mt-7 space-y-5">
      <section className="space-y-3 rounded-3xl border border-white/10 bg-white/[.04] p-5">
        <h2 className="text-xl font-bold">Pending password requests</h2>
        {requests.length === 0 ? <p className="text-sm text-white/50">No pending reset requests.</p> : requests.map((request) => {
          const member = request.user.member;
          const q = member?.admissionId ?? request.requestedByMobile;
          return (
            <form key={request.id} onSubmit={(event) => submit(event, request.id)} className="space-y-3 rounded-2xl bg-black/20 p-4">
              <div>
                <b>{member?.fullName ?? "Member account"}</b>
                <p className="text-xs text-white/45">{member?.admissionId ?? "No admission ID"} · {member?.mobileNumber ?? request.requestedByMobile} · {new Date(request.createdAt).toLocaleString("en-IN")}</p>
              </div>
              <input type="hidden" name="q" value={q} />
              <input name="password" required type="password" minLength={8} maxLength={128} autoComplete="new-password" placeholder="New temporary password" className="w-full rounded-xl bg-white/5 p-3.5" />
              <button disabled={busy} className="flex min-h-11 w-full items-center justify-center rounded-xl bg-zenith-500 px-4 font-bold text-slate-950 disabled:opacity-60">
                {busy ? <LoaderCircle className="animate-spin" /> : "Set temporary password"}
              </button>
            </form>
          );
        })}
      </section>
      <form onSubmit={(event) => submit(event)} className="space-y-4 rounded-3xl border border-white/10 bg-white/[.04] p-5">
        <h2 className="flex items-center gap-2 text-xl font-bold"><KeyRound size={21} /> Set member temporary password</h2>
        <input name="q" required placeholder="Admission ID or registered mobile" className="w-full rounded-xl bg-black/20 p-3.5" />
        <input name="password" required type="password" minLength={8} maxLength={128} autoComplete="new-password" placeholder="New temporary password" className="w-full rounded-xl bg-black/20 p-3.5" />
        <p className="text-xs text-white/45">Use at least 8 characters with a letter and number. The member will be asked to change it after signing in.</p>
        <button disabled={busy} className="flex min-h-12 w-full items-center justify-center rounded-xl bg-zenith-500 px-5 font-bold text-slate-950 disabled:opacity-60">
          {busy ? <LoaderCircle className="animate-spin" /> : "Set temporary password"}
        </button>
        {message && <p role="status" className="rounded-xl bg-white/10 p-3 text-sm text-white/75">{message}</p>}
      </form>
    </div>
  );
}
