import Link from "next/link";
import { ZenithLogo } from "@/components/brand/zenith-logo";
import { ExploreClient } from "@/components/visitors/explore-client";
import { getVisitor } from "@/lib/auth/visitor-session";
import { prisma } from "@/lib/database/prisma";
import { indiaToday, upiPaymentUri } from "@/lib/visitor";
import { membershipEndDate } from "@/lib/membership-dates";

export const dynamic = "force-dynamic";
export default async function ExplorePage() {
  const visitor = await getVisitor();
  let unavailable = false;
  let plans: { id: string; planName: string; category: string | null; durationDays: number; standardPrice: string | null }[] = [];
  let orders: { id: string; planName: string; amount: string; status: string; reference: string; utr: string | null; upiUri: string }[] = [];
  try {
    plans = (await prisma.membershipPlan.findMany({ where: { isActive: true }, orderBy: { durationDays: "asc" } })).map(p => ({ id: p.id, planName: p.planName, category: p.category, durationDays: p.durationDays, standardPrice: p.standardPrice?.toFixed(2) ?? null }));
    if (visitor) orders = (await prisma.membershipOrder.findMany({ where: { visitorId: visitor.id }, orderBy: { createdAt: "desc" }, take: 20 })).map(o => ({ id: o.id, planName: o.planName, amount: o.amount.toFixed(2), status: o.status, reference: o.reference, utr: o.utr, startDate: o.startDate?.toISOString().slice(0, 10), endDate: o.startDate ? membershipEndDate(o.startDate.toISOString().slice(0, 10), o.durationDays) : undefined, upiUri: upiPaymentUri(o.amount.toFixed(2), o.reference) }));
  } catch { unavailable = true; }
  return <main className="min-h-dvh bg-[radial-gradient(ellipse_at_top,#332b10,#07110e_50%)] px-5 pb-12 pt-[calc(1.5rem+env(safe-area-inset-top))]"><div className="mx-auto max-w-5xl"><header className="mb-6 flex items-center justify-between gap-3"><Link href="/login" aria-label="Zenith Fitness home"><ZenithLogo compact/></Link><Link href="/login" className="visitor-secondary text-xs">Already a member? Log in</Link></header><ExploreClient plans={plans} orders={orders} today={indiaToday()} unavailable={unavailable} visitor={visitor ? { fullName: visitor.fullName, mobileNumber: visitor.mobileNumber, memberId: visitor.memberId } : null}/><footer className="mt-10 flex justify-center gap-5 text-xs text-white/40"><Link href="/privacy">Privacy Policy</Link><Link href="/terms">Terms & Support</Link></footer></div></main>;
}
