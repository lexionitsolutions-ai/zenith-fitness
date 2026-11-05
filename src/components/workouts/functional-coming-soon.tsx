import { Activity, Clock3 } from "lucide-react";

export function FunctionalComingSoon() {
  return <main className="mx-auto flex min-h-[65dvh] max-w-3xl items-center justify-center px-4 pb-28 pt-8">
    <section className="w-full rounded-3xl border border-zenith-400/20 bg-white/[.04] px-6 py-12 text-center">
      <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-zenith-500/10 text-zenith-400"><Activity size={38} /></span>
      <p className="mt-6 text-xs font-bold uppercase tracking-[.2em] text-zenith-400">Functional Batch</p>
      <h1 className="mt-3 text-4xl font-black">Coming Soon</h1>
      <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-white/55">Your functional training experience is on the way. Check back for updates.</p>
      <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-xs text-white/45"><Clock3 size={14} />In progress</div>
    </section>
  </main>;
}
