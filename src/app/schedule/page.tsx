import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { getNextScheduleSession, getScheduleSessions } from "@/services/schedule.service";
import Link from "next/link";
import { ArrowLeft, CalendarDays, Clock } from "lucide-react";
import { MemberBottomNav } from "@/components/layout/member-bottom-nav";

export default async function Page() {
  if (!(await getSession())?.memberId) redirect("/login");
  const schedule = await getScheduleSessions();
  const next = getNextScheduleSession(schedule);
  const groups = [1, 2, 3, 4, 5, 6].map((day) => ({ day, sessions: schedule.filter((x) => x.day === day) })).filter((group) => group.sessions.length);

  return (
    <main className="safe-bottom mx-auto min-h-dvh max-w-3xl px-4 pb-6 pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <Link href="/dashboard" className="inline-flex min-h-11 items-center gap-2 text-white/60"><ArrowLeft size={18} />Dashboard</Link>
      <header className="mt-5"><p className="text-sm text-zenith-400">WEEKLY PROGRAM</p><h1 className="text-3xl font-black">Batch schedule</h1></header>
      <article className="mt-6 rounded-3xl bg-gradient-to-br from-zenith-500 to-emerald-800 p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-white/70">Up next</p>
        <h2 className="mt-2 text-2xl font-black">{next.name}</h2>
        <p>{next.dayName} · {new Date(next.startsAt).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" })}</p>
      </article>
      <div className="mt-6 space-y-4">{groups.map((group) => (
        <section key={group.day} className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <h2 className="flex items-center gap-2 font-bold"><CalendarDays size={18} className="text-zenith-400" />{group.sessions[0].dayName}</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">{group.sessions.map((session, index) => (
            <div key={`${session.time}-${index}`} className="flex items-center gap-3 rounded-xl bg-black/20 p-3">
              <Clock size={17} className="text-white/40" />
              <div><b>{new Date(`2000-01-01T${session.time}:00`).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}</b><p className="text-sm text-white/55">{session.name}</p></div>
            </div>
          ))}</div>
        </section>
      ))}</div>
      <MemberBottomNav active="schedule" />
    </main>
  );
}
