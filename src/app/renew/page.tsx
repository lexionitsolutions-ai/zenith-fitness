import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActiveRole } from "@/lib/auth/authorize";
import { prisma } from "@/lib/database/prisma";
import { indiaToday, upiPaymentUri } from "@/lib/visitor";
import { membershipEndDate } from "@/lib/membership-dates";
import { membershipCategories, type MembershipCategory } from "@/constants/membership-packages";
import { RenewalClient } from "@/components/visitors/renewal-client";
export const dynamic = "force-dynamic";
export default async function RenewPage() {
  const session = await requireActiveRole(["MEMBER"]).catch(() => null);
  if (!session?.memberId) redirect("/login");
  if (session.onboardingRequired) redirect("/onboarding");
  const [member, plans, orders] = await Promise.all([
    prisma.member.findUniqueOrThrow({ where: { id: session.memberId }, include: { memberships: { orderBy: { endDate: "desc" }, take: 1 } } }),
    prisma.membershipPlan.findMany({ where: { isActive: true, standardPrice: { gt: 0 } }, orderBy: { durationDays: "asc" } }),
    prisma.membershipOrder.findMany({ where: { memberId: session.memberId, kind: "RENEWAL" }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  const previousCategory = member.memberships[0]?.category;
  const initialCategory: MembershipCategory = membershipCategories.some(c => c.code === previousCategory) ? previousCategory as MembershipCategory : member.gender?.toLowerCase() === "female" ? "FEMALE" : "MALE";
  return <main className="mx-auto min-h-dvh max-w-3xl px-5 py-8"><Link href="/dashboard" className="visitor-secondary">← Back to dashboard</Link><p className="visitor-eyebrow mt-7">CONTINUE YOUR ZENITH JOURNEY</p><h1 className="mt-2 text-3xl font-black">Renew your membership</h1><RenewalClient today={indiaToday()} initialCategory={initialCategory} currentEnd={member.memberships[0]?.endDate?.toISOString().slice(0, 10) ?? null} plans={plans.map(p => ({ id: p.id, planName: p.planName, category: p.category, durationDays: p.durationDays, amount: p.standardPrice!.toFixed(2) }))} orders={orders.map(o => { const start = o.startDate?.toISOString().slice(0, 10); return { id: o.id, planName: o.planName, amount: o.amount.toFixed(2), reference: o.reference, status: o.status, utr: o.utr, startDate: start, endDate: start ? membershipEndDate(start, o.durationDays) : undefined, upiUri: upiPaymentUri(o.amount.toFixed(2), o.reference) }; })}/></main>;
}
