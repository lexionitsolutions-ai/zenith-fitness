import Link from "next/link";
import { requireActiveRole } from "@/lib/auth/authorize";
import { purchaseOverview } from "@/services/membership-purchase.service";
import { MembershipShop } from "@/components/membership/membership-shop";
import { MemberBottomNav } from "@/components/layout/member-bottom-nav";
export const dynamic = "force-dynamic";
export default async function Page() {
  const s = await requireActiveRole(["MEMBER"]);
  return <><main className="mx-auto min-h-dvh max-w-3xl px-4 pb-32 pt-8"><Link href="/dashboard" className="mb-6 inline-block min-h-11 text-sm text-white/60">← Home</Link><MembershipShop initial={await purchaseOverview(s.userId)}/></main><MemberBottomNav active="home"/></>;
}
