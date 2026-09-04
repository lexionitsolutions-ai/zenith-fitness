"use client";

import { Search, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";

type ProgressMember = Awaited<ReturnType<typeof import("@/services/fitness-target.service").getStaffMemberProgressList>>[number];

export function StaffProgressList({ members }: { members: ProgressMember[] }) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return members;
    return members.filter((member) =>
      [member.admissionId, member.memberName, member.goal].some((field) => field.toLowerCase().includes(value))
    );
  }, [members, query]);

  return (
    <main className="mx-auto min-h-dvh max-w-4xl px-5 py-8">
      <p className="text-sm text-zenith-400">ZENITH STAFF</p>
      <h1 className="mt-1 text-3xl font-black">Member progress</h1>

      <label className="mt-6 flex min-h-12 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4">
        <Search className="shrink-0 text-white/45" size={19} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search member name, ID, or goal"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-white/35"
        />
      </label>

      <section className="mt-5 space-y-3">
        {filtered.length ? filtered.map((member) => (
          <article key={member.id} className="rounded-2xl border border-white/10 bg-white/[.045] p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-widest text-white/38">{member.admissionId}</p>
                <h2 className="mt-1 truncate text-lg font-black">{member.memberName}</h2>
                <p className="mt-1 text-sm text-white/55">{member.goal}</p>
                <p className="mt-1 text-xs font-semibold text-white/52">Target: {member.targetRange}</p>
                <p className="mt-1 text-xs text-white/38">Next BMI: {new Date(`${member.nextBmiDate}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-2xl font-black text-zenith-300">{member.progress}/100</p>
                <p className="text-xs text-white/38">Progress</p>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/30">
              <div className="h-full rounded-full bg-zenith-400" style={{ width: `${member.progress}%` }} />
            </div>
          </article>
        )) : (
          <article className="rounded-2xl border border-white/10 bg-white/[.045] p-6 text-center text-sm text-white/45">
            No member progress found.
          </article>
        )}
      </section>
    </main>
  );
}
