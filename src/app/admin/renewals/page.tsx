import { redirect } from "next/navigation";
import Link from "next/link";
import { requireActiveRole } from "@/lib/auth/authorize";
import { prisma } from "@/lib/database/prisma";
import { RenewalAdmin } from "@/components/admin/renewal-admin";
export const dynamic = "force-dynamic";
export default async function Page() {
  try { await requireActiveRole(["ADMIN"]); } catch { redirect("/login"); }
  const [pending, unsynced, recent] = await Promise.all([
    prisma.renewalRequest.findMany({ where: { status: "SUBMITTED" }, include: { member: true, sheetsJob: true }, orderBy: { submittedAt: "asc" }, take: 200 }),
    prisma.renewalRequest.findMany({ where: { status: "APPROVED", sheetsJob: { status: { not: "SYNCED" } } }, include: { member: true, sheetsJob: true }, orderBy: { reviewedAt: "desc" }, take: 200 }),
    prisma.renewalRequest.findMany({ where: { status: { in: ["APPROVED", "REJECTED"] } }, include: { member: true, sheetsJob: true }, orderBy: { reviewedAt: "desc" }, take: 30 }),
  ]);
  const requests = [...new Map([...pending,...unsynced,...recent].map(r => [r.id,r])).values()];
  return <main className="mx-auto min-h-dvh max-w-3xl px-5 pb-32 pt-8"><Link href="/admin/members" className="text-sm text-white/50">&larr; Member access</Link><p className="mt-6 text-xs font-bold uppercase tracking-widest text-zenith-400">MEMBERSHIP RENEWALS</p><h1 className="mt-2 text-3xl font-black">Review. Approve. Keep moving.</h1><p className="mt-3 text-sm text-white/55">Verify each UPI payment against the ICICI Bank account. Approved renewals are saved to the member and sent to reception Sheets.</p><RenewalAdmin requests={JSON.parse(JSON.stringify(requests))}/></main>;
}
