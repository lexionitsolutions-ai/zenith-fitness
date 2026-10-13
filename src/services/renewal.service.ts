import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/database/prisma";
import { AppError } from "@/lib/errors";
import { membershipPackages } from "@/constants/membership-packages";
import { indiaToday, renewalDates, upiUri } from "@/lib/renewals";
import { sheetText } from "@/lib/sheets/reception";
import { syncRenewalSheetsJob } from "./renewal-sheets.service";

export async function createRenewal(memberId: string, planCode: string) {
  const plan = membershipPackages.find(p => p.planCode === planCode);
  if (!plan) throw new AppError("INVALID_PLAN", "Choose an available membership plan.");
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "Member" WHERE "id" = ${memberId}::uuid FOR UPDATE`;
    const member = await tx.member.findUniqueOrThrow({ where: { id: memberId } });
    if (!member.mobileNumber) throw new AppError("MOBILE_REQUIRED", "Ask reception to add your mobile number before renewing.");
    if (plan.category !== "MALE" && !/^female$/i.test(member.gender?.trim() ?? "")) throw new AppError("CATEGORY_REQUIRED", "Female packages require a female member profile. Ask reception to check your profile.");
    const open = await tx.renewalRequest.findFirst({ where: { memberId, status: { in: ["DRAFT", "SUBMITTED"] } } });
    if (open) {
      if (open.planCode === planCode) return open;
      throw new AppError("OPEN_REQUEST", "You already have a renewal in progress. Cancel an unpaid checkout before choosing another plan.", 409);
    }
    return tx.renewalRequest.create({ data: { memberId, reference: `ZF-${randomUUID().replace(/-/g, "").slice(0, 20).toUpperCase()}`, planCode, planName: plan.planName, category: plan.category, durationDays: plan.durationDays, amount: plan.standardPrice } });
  });
}
export async function submitRenewal(memberId: string, id: string, utr: string) {
  try {
    return await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "RenewalRequest" WHERE "id" = ${id}::uuid FOR UPDATE`;
      const order = await tx.renewalRequest.findUnique({ where: { id } });
      if (!order || order.memberId !== memberId) throw new AppError("NOT_FOUND", "Renewal not found.", 404);
      if (order.status === "SUBMITTED" && order.utr === utr) return order;
      if (order.status !== "DRAFT") throw new AppError("CLOSED_REQUEST", "This renewal cannot be changed.", 409);
      return tx.renewalRequest.update({ where: { id }, data: { utr, status: "SUBMITTED", submittedAt: new Date() } });
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new AppError("DUPLICATE_UTR", "This transaction reference has already been used. Check your payment receipt.", 409);
    throw e;
  }
}
export async function cancelRenewal(memberId: string, id: string) {
  const result = await prisma.renewalRequest.updateMany({ where: { id, memberId, status: "DRAFT" }, data: { status: "CANCELLED" } });
  if (!result.count) throw new AppError("CANNOT_CANCEL", "Only an unpaid checkout can be cancelled.", 409);
}
export async function reviewRenewal(id: string, approve: boolean, adminId: string, reason?: string) {
  const jobId = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "RenewalRequest" WHERE "id" = ${id}::uuid FOR UPDATE`;
    const order = await tx.renewalRequest.findUnique({ where: { id } });
    if (!order || order.status !== "SUBMITTED" || !order.utr) throw new AppError("ALREADY_REVIEWED", "Only a submitted renewal can be reviewed. Refresh the queue.", 409);
    if (!approve) {
      if (!reason?.trim()) throw new AppError("REASON_REQUIRED", "Explain why this renewal was rejected.");
      await tx.renewalRequest.update({ where: { id }, data: { status: "REJECTED", rejectionReason: reason.trim(), reviewedById: adminId, reviewedAt: new Date() } });
      return null;
    }
    await tx.$queryRaw`SELECT "id" FROM "Member" WHERE "id" = ${order.memberId}::uuid FOR UPDATE`;
    const member = await tx.member.findUniqueOrThrow({ where: { id: order.memberId } });
    if (!member.mobileNumber) throw new AppError("MOBILE_REQUIRED", "Add the member's mobile number before approval.");
    const latest = await tx.membership.findFirst({ where: { memberId: member.id, membershipStatus: { not: "REVIEW_REQUIRED" }, paymentStatus: "PAID", endDate: { not: null } }, orderBy: { endDate: "desc" } });
    const { start, end } = renewalDates(indiaToday(), latest?.endDate?.toISOString().slice(0, 10) ?? null, order.durationDays);
    const remarks = `ZenithApp:${order.reference}; UPI ${order.utr}; RENEWAL; approved by ${adminId}`;
    const plan = await tx.membershipPlan.upsert({ where: { planCode: order.planCode }, create: { planCode: order.planCode, planName: order.planName, category: order.category, durationDays: order.durationDays, standardPrice: order.amount }, update: {} });
    const membership = await tx.membership.create({ data: { memberId: member.id, planId: plan.id, planDays: order.durationDays, category: order.category === "FEMALE_HAPPY_HOURS" ? "Happy Hours" : "Regular", startDate: new Date(`${start}T00:00:00Z`), endDate: new Date(`${end}T00:00:00Z`), totalAmount: order.amount, finalAmount: order.amount, amountPaid: order.amount, pendingAmount: 0, paymentMode: "UPI", paymentStatus: "PAID", membershipStatus: start > indiaToday() ? "UPCOMING" : "ACTIVE", sourceType: "NEW_ADMISSION", sourceSheet: `ONLINE-${order.reference}`, sourceRow: 1, remarks } });
    await tx.renewalRequest.update({ where: { id }, data: { status: "APPROVED", membershipId: membership.id, startDate: new Date(`${start}T00:00:00Z`), endDate: new Date(`${end}T00:00:00Z`), reviewedById: adminId, reviewedAt: new Date() } });
    const amount = order.amount.toFixed(2);
    const job = await tx.renewalSheetsJob.create({ data: { requestId: id, key: `RENEWAL:${id}`, payload: {
      action: "saveRenewal", reference: order.reference, localMemberId: member.id, localMembershipId: membership.id,
      admissionId: member.admissionId, name: sheetText(member.fullName), mobile: member.mobileNumber.replace(/\D/g, "").slice(-10),
      gender: member.gender ?? "", birthDate: member.birthDate?.toISOString().slice(0, 10) ?? "", address: sheetText(member.address), injuries: sheetText(member.medicalHistory),
      category: order.category === "FEMALE_HAPPY_HOURS" ? "Happy Hours" : "Regular", plan: String(order.durationDays), startDate: start, endDate: end,
      totalAmount: amount, amount, discount: "0", finalAmount: amount, amountPaid: amount, pendingAmount: "0", paymentMode: "UPI", paymentStatus: "Paid", remarks,
    } } });
    return job.id;
  });
  // Approval is durable even when the external delivery is unavailable.
  if (!jobId) return null;
  try { return await syncRenewalSheetsJob(jobId); } catch { return "PENDING"; }
}
export function serializeRenewal(order: { id: string; amount: Prisma.Decimal; reference: string; status: string; planName: string; utr: string | null }) {
  return { ...order, amount: order.amount.toFixed(2), upiUri: upiUri(order.amount.toFixed(2), order.reference) };
}
