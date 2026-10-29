import Link from "next/link";
import { LogoutButton } from "@/components/auth/logout-button";
import { MemberBottomNav } from "@/components/layout/member-bottom-nav";
import { ZenithLogo } from "@/components/brand/zenith-logo";
import { MembershipShop } from "./membership-shop";
import { MembershipRefresh } from "@/components/dashboard/membership-refresh";
type Data = Awaited<ReturnType<typeof import("@/services/membership-purchase.service").purchaseOverview>>;
export function GuestDashboard({ data }: { data: Data }) {
  return <><MembershipRefresh/><div className="app-topbar border-b border-white/10"><div className="mx-auto max-w-3xl px-4 py-3"><ZenithLogo compact/></div></div>
    <main className="mx-auto min-h-dvh max-w-3xl px-4 pb-32 pt-6"><header className="flex items-center justify-between"><div><p className="text-sm text-white/50">Welcome to Zenith</p><h1 className="text-2xl font-black">{data.name.split(" ")[0]}</h1></div><LogoutButton/></header>
      <section className="mt-6 rounded-3xl bg-gradient-to-br from-zenith-500 to-emerald-900 p-6"><p className="text-xs font-bold uppercase tracking-widest text-white/60">Membership</p><h2 className="mt-2 text-3xl font-black">No Active Plan</h2><p className="mt-3 text-sm text-white/70">Explore workouts, complete your profile and choose a membership to unlock your gym admission.</p></section>
      <div className="my-6 grid grid-cols-2 gap-3"><Link href="/workout" className="rounded-2xl border border-white/10 bg-white/5 p-5 font-bold">Explore workouts →</Link><Link href="/schedule" className="rounded-2xl border border-white/10 bg-white/5 p-5 font-bold">View schedule →</Link></div>
      <MembershipShop initial={data}/>
    </main><MemberBottomNav active="home"/></>;
}
