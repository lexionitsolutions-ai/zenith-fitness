import { redirect } from "next/navigation";
import { requireRenewalMember } from "@/lib/auth/renewal-member";
import { prisma } from "@/lib/database/prisma";
import { serializeRenewal } from "@/services/renewal.service";
import { RenewalClient } from "@/components/renewals/renewal-client";
import { MemberBottomNav } from "@/components/layout/member-bottom-nav";
export const dynamic = "force-dynamic";
export default async function Page() {
  let memberId: string;
  try { memberId = await requireRenewalMember(); } catch { redirect("/login"); }
  const member = await prisma.member.findUniqueOrThrow({ where: { id: memberId }, include: { memberships: { where: { paymentStatus: "PAID", membershipStatus: { not: "REVIEW_REQUIRED" }, endDate: { not: null } }, orderBy: { endDate: "desc" }, take: 1 }, renewalRequests: { orderBy: { createdAt: "desc" }, take: 30 } } });
  return <><RenewalClient name={member.fullName} admissionId={member.admissionId} gender={member.gender} currentEnd={member.memberships[0]?.endDate?.toISOString() ?? null} history={JSON.parse(JSON.stringify(member.renewalRequests.map(serializeRenewal)))}/><MemberBottomNav active="home"/></>;
}
