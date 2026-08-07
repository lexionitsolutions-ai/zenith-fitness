import Link from "next/link";
import { ZenithLogo } from "@/components/brand/zenith-logo";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="native-scroll min-h-dvh px-5 py-8">
      <article className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/[.04] p-6 shadow-2xl sm:p-8">
        <Link href="/login" className="inline-flex min-h-11 items-center text-sm text-white/60">
          Back to login
        </Link>
        <ZenithLogo compact className="mt-2" priority />
        <p className="mt-6 text-sm font-semibold uppercase tracking-widest text-zenith-400">Zenith Fitness</p>
        <h1 className="mt-2 text-3xl font-black">{title}</h1>
        <p className="mt-2 text-sm text-white/45">Last updated: {updated}</p>
        <div className="mt-8 space-y-7 text-sm leading-6 text-white/70">{children}</div>
      </article>
    </main>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-white">{title}</h2>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}
