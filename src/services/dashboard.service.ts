import { prisma } from "@/lib/database/prisma";
import { calculateMembershipStatus, daysBetween } from "@/lib/utils/status";
import { AppError } from "@/lib/errors";

export async function getDashboard(memberId: string, now = new Date()) {
  const member = await prisma.member.findUnique({ where: { id: memberId }, include: { memberships: { include: { plan: true } } } });
  if (!member) throw new AppError("MEMBER_NOT_FOUND", "Member profile not found.", 404);

  const all = member.memberships.map((membership) => ({ ...membership, currentStatus: calculateMembershipStatus(membership.startDate, membership.endDate, now) }));
  const active = all.filter((membership) => membership.currentStatus === "ACTIVE").sort((a, b) => (b.endDate?.valueOf() ?? 0) - (a.endDate?.valueOf() ?? 0));
  const selected = active[0] ?? all.filter((membership) => membership.currentStatus === "UPCOMING").sort((a, b) => (a.startDate?.valueOf() ?? 0) - (b.startDate?.valueOf() ?? 0))[0] ?? all.filter((membership) => membership.currentStatus === "EXPIRED").sort((a, b) => (b.endDate?.valueOf() ?? 0) - (a.endDate?.valueOf() ?? 0))[0] ?? null;
  const warnings = active.length > 1 ? ["Multiple active memberships found. Please contact staff."] : [];
  const editableFields = [member.gender, member.birthDate, member.address, member.medicalHistory];
  const completion = Math.round((editableFields.filter(Boolean).length / editableFields.length) * 100);
  const alerts: { type: string; severity: string; title: string; message: string }[] = [];
  const days = selected?.endDate ? daysBetween(now, selected.endDate) : null;

  if (selected?.currentStatus === "ACTIVE" && days !== null && days <= 15) alerts.push({ type: days === 0 ? "EXPIRES_TODAY" : "RENEWAL_DUE_SOON", severity: "warning", title: days === 0 ? "Membership expires today" : "Renewal due soon", message: days === 0 ? "Renew today to stay active." : `${days} days remaining.` });
  if (selected?.currentStatus === "EXPIRED") alerts.push({ type: "MEMBERSHIP_EXPIRED", severity: "error", title: "Membership expired", message: "Contact the front desk to renew." });
  if (selected && Number(selected.pendingAmount) > 0) alerts.push({ type: "PAYMENT_PENDING", severity: "warning", title: "Payment pending", message: `Rs ${Number(selected.pendingAmount).toLocaleString("en-IN")} is pending.` });
  if (completion < 100) alerts.push({ type: "PROFILE_INCOMPLETE", severity: "info", title: "Complete your profile", message: "Fill the remaining safe profile details below." });

  return {
    member: {
      admissionId: member.admissionId,
      name: member.fullName,
      mobile: member.mobileNumber,
      gender: member.gender,
      birthDate: member.birthDate?.toISOString().slice(0, 10) ?? null,
      address: member.address,
      medicalHistory: member.medicalHistory,
      profileCompletionPercentage: completion,
    },
    membership: selected ? { status: selected.currentStatus, planCode: selected.plan?.planCode ?? null, planName: selected.plan?.planName ?? "Plan requires review", category: selected.category, startDate: selected.startDate?.toISOString().slice(0, 10) ?? null, endDate: selected.endDate?.toISOString().slice(0, 10) ?? null, daysRemaining: days } : null,
    payment: selected ? { finalAmount: Number(selected.finalAmount), amountPaid: Number(selected.amountPaid), pendingAmount: Number(selected.pendingAmount), paymentStatus: selected.paymentStatus, paymentMode: selected.paymentMode } : null,
    alerts,
    dataWarnings: warnings,
  };
}
