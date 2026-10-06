import { redirect } from "next/navigation";
import { requireActiveRole } from "@/lib/auth/authorize";
import { prisma } from "@/lib/database/prisma";
import { JoiningAdmin } from "@/components/admin/joining-admin";
import { membershipCategories } from "@/constants/membership-packages";
import { membershipEndDate } from "@/lib/membership-dates";
export const dynamic = "force-dynamic";
export default async function JoiningPage() {
  try { await requireActiveRole(["ADMIN"]); } catch { redirect("/login"); }
  const [plans, enquiries, orders, jobs] = await Promise.all([
    prisma.membershipPlan.findMany({ where: { category: { in: membershipCategories.map(c => c.code) } }, orderBy: [{ category: "asc" }, { durationDays: "asc" }] }),
    prisma.trialEnquiry.findMany({ orderBy: [{ trialDate: "desc" }, { createdAt: "desc" }], take: 100 }),
    prisma.membershipOrder.findMany({ include: { visitor: { select: { fullName: true, mobileNumber: true } }, member: { select: { fullName: true, mobileNumber: true, admissionId: true } } }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.sheetsSyncJob.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  return <main className="mx-auto max-w-3xl px-5 py-8"><p className="visitor-eyebrow">ADMIN · MEMBERSHIPS</p><h1 className="mt-2 text-3xl font-black">Admissions, renewals & enquiries</h1><JoiningAdmin
    plans={plans.map(p => ({ id: p.id, planName: p.planName, standardPrice: p.standardPrice?.toFixed(2) ?? null, isActive: p.isActive }))}
    enquiries={enquiries.map(e => ({ id: e.id, name: e.name, contact: e.contact, trialDate: e.trialDate.toISOString().slice(0, 10), status: e.status }))}
    orders={orders.map(o => { const start = o.startDate?.toISOString().slice(0, 10); return { id: o.id, planName: o.planName, reference: o.reference, utr: o.utr, status: o.status, kind: o.kind, amount: o.amount.toFixed(2), customer: { fullName: o.member?.fullName ?? o.visitor?.fullName ?? "Unknown member", mobileNumber: o.member?.mobileNumber ?? o.visitor?.mobileNumber ?? "", admissionId: o.member?.admissionId ?? null }, startDate: start ?? null, endDate: start ? membershipEndDate(start, o.durationDays) : null }; })}
    jobs={jobs.map(j => ({ id: j.id, key: j.key, kind: j.kind, status: j.status, lastError: j.lastError, name: typeof (j.payload as Record<string, unknown>).name === "string" ? String((j.payload as Record<string, unknown>).name) : "", attempts: j.attempts }))}
  /></main>;
}
