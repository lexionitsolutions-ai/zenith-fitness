import { MemberBottomNav } from "./member-bottom-nav";
import { ZenithLogo } from "@/components/brand/zenith-logo";

export function MemberPageLoading({ active, title }: {
  active: React.ComponentProps<typeof MemberBottomNav>["active"];
  title: string;
}) {
  return <>
    <div className="app-topbar border-b border-white/10"><div className="safe-x mx-auto max-w-5xl px-4 py-3 sm:px-8"><ZenithLogo compact /></div></div>
    <main className="mx-auto min-h-dvh max-w-5xl px-5 py-8" aria-busy="true" aria-label={`Loading ${title}`}>
      <h1 className="text-2xl font-black">{title}</h1>
      <div aria-hidden="true" className="mt-6 space-y-4 motion-safe:animate-pulse">
        <div className="h-48 rounded-3xl border border-white/10 bg-white/5" />
        <div className="h-28 rounded-3xl border border-white/10 bg-white/5" />
      </div>
    </main>
    <MemberBottomNav active={active} />
  </>;
}
