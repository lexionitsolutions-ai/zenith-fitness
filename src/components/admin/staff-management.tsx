"use client";

import { useState } from "react";
import { LoaderCircle, Trash2, UserPlus, Users } from "lucide-react";

type Staff = {
  id: string;
  displayName: string | null;
  mobileNumber: string;
  createdAt: string;
  lastLoginAt: string | null;
};

export function StaffManagement({ initial }: { initial: Staff[] }) {
  const [staff, setStaff] = useState(initial);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const response = await fetch("/api/admin/staff", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: data.get("name"),
        mobile: data.get("mobile"),
        password: data.get("password"),
      }),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(result.error?.message ?? "Unable to create staff member.");
    setStaff((current) => [...current, result.data].sort((a, b) => (a.displayName ?? "").localeCompare(b.displayName ?? "")));
    form.reset();
    setMessage("Staff account created successfully.");
  }

  async function remove(person: Staff) {
    if (!confirm(`Remove staff access for ${person.displayName ?? person.mobileNumber}?`)) return;
    const response = await fetch(`/api/admin/staff?id=${encodeURIComponent(person.id)}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error?.message ?? "Unable to remove staff member.");
    setStaff((current) => current.filter((item) => item.id !== person.id));
    setMessage("Staff access removed. Their audit history has been preserved.");
  }

  return (
    <main className="mx-auto min-h-dvh max-w-4xl px-5 py-8">
      <p className="text-sm text-zenith-400">ADMIN ACCESS</p>
      <h1 className="mt-1 flex items-center gap-3 text-3xl font-black"><Users /> Staff management</h1>

      <form onSubmit={create} className="mt-7 grid gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 sm:grid-cols-2">
        <h2 className="flex items-center gap-2 text-lg font-bold sm:col-span-2"><UserPlus size={20} /> Create staff account</h2>
        <input name="name" required minLength={2} maxLength={100} placeholder="Staff member name" className="rounded-xl bg-black/20 p-3.5" />
        <input name="mobile" required inputMode="tel" placeholder="Mobile number" className="rounded-xl bg-black/20 p-3.5" />
        <input name="password" required type="password" minLength={8} maxLength={128} autoComplete="new-password" placeholder="Temporary staff password" className="rounded-xl bg-black/20 p-3.5 sm:col-span-2" />
        <p className="text-xs text-white/45 sm:col-span-2">Use at least 8 characters with a letter and number. Staff passwords are not shared with member accounts.</p>
        <button disabled={busy} className="flex min-h-12 items-center justify-center rounded-xl bg-zenith-500 font-bold text-[#07110e] sm:col-span-2">
          {busy ? <LoaderCircle className="animate-spin" /> : "Create staff member"}
        </button>
      </form>

      {message && <p role="status" className="mt-4 rounded-xl bg-white/10 p-4 text-sm">{message}</p>}

      <section className="mt-8">
        <h2 className="text-xl font-bold">Active staff ({staff.length})</h2>
        <div className="mt-4 space-y-3">
          {staff.length === 0 && <p className="text-white/45">No active staff accounts.</p>}
          {staff.map((person) => (
            <article key={person.id} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div>
                <b>{person.displayName ?? "Unnamed staff member"}</b>
                <p className="text-sm text-white/55">{person.mobileNumber}</p>
                <p className="mt-1 text-xs text-white/35">{person.lastLoginAt ? `Last login ${new Date(person.lastLoginAt).toLocaleString("en-IN")}` : "Has not logged in yet"}</p>
              </div>
              <button onClick={() => remove(person)} className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl bg-red-500/10 px-3 text-sm text-red-200">
                <Trash2 size={17} /> Remove
              </button>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
