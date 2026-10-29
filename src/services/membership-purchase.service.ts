import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/database/prisma";
import { AppError } from "@/lib/errors";
import { membershipPeriod, planForGender, renewalDiscount, upiPaymentUrl, MERCHANT } from "@/lib/membership-plans";
import { indiaBusinessDate } from "@/lib/utils/point-rules";
import { authoritativeMemberships } from "@/lib/utils/management-memberships";
import { membershipWhatsAppUrl } from "@/lib/membership-whatsapp";
import { appDatabaseObject } from "@/lib/database/app-object";

async function serial<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let i = 0; ; i++) {
    try { return await prisma.$transaction(work, { isolationLevel: "Serializable", timeout: 20000 }); }
    catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" && i < 3) continue;
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new AppError("CONFLICT", "This payment reference or checkout already exists. Refresh to see the latest status.", 409);
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2010") {
        const detail = String(error.meta?.message ?? "");
        const expected = [
          ["UTR already recorded", "This UTR is already recorded in the merchant ledger. Reconcile the receipt before approving."],
          ["Phone already admitted", "This phone already belongs to a gym admission. Reconcile the app account before approval."],
          ["Reconcile this member", "Link this member to the membership manager before approving the renewal."],
          ["Fingerprint ID capacity", "The fingerprint ID capacity has been reached. Contact the gym administrator."],
        ];
        const match = expected.find(([key]) => detail.includes(key));
        if (match) throw new AppError("RECONCILIATION_REQUIRED", match[1], 409);
      }
      throw error;
    }
  }
}

export async function purchaseOverview(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { applicantProfile: true, member: true } });
  if (!user?.isActive || user.role !== "MEMBER") throw new AppError("UNAUTHORIZED", "Active member account required.", 401);
  const [orders, points] = await Promise.all([
    prisma.membershipOrder.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 20 }),
    user.memberId ? prisma.pointTransaction.aggregate({ where: { memberId: user.memberId }, _sum: { points: true } }) : null,
  ]);
  const profile = user.member ?? user.applicantProfile;
  return { name: user.member?.fullName ?? user.displayName ?? "Welcome", mobile: user.mobileNumber,
    gender: profile?.gender ?? "", address: profile?.address ?? "", birthDate: profile?.birthDate?.toISOString().slice(0,10) ?? "",
    isMember: Boolean(user.memberId), points: Math.max(0, points?._sum.points ?? 0), merchant: MERCHANT,
    orders: orders.map(o => ({ ...o, createdAt: o.createdAt.toISOString(), updatedAt: o.updatedAt.toISOString(), reviewedAt: o.reviewedAt?.toISOString() ?? null, upiUrl: upiPaymentUrl(o), whatsappUrl: o.utr && ["PENDING_REVIEW", "APPROVED"].includes(o.status) ? membershipWhatsAppUrl({ name:user.member?.fullName ?? user.displayName ?? "Member", mobile:user.mobileNumber },o) : null })) };
}

export async function createMembershipOrder(userId: string, planCode: string, replaceExisting = false) {
  return serial(async tx => {
    await tx.$queryRaw`SELECT id FROM ${appDatabaseObject("User")} WHERE id=${userId}::uuid FOR UPDATE`;
    const user = await tx.user.findUnique({ where: { id: userId }, include: { member: true, applicantProfile: true } });
    if (!user?.isActive || user.role !== "MEMBER") throw new AppError("UNAUTHORIZED", "Active member account required.", 401);
    const existing = await tx.membershipOrder.findFirst({ where: { userId, status: { in: ["AWAITING_PAYMENT", "PENDING_REVIEW"] } } });
    if (existing && (!replaceExisting || existing.planCode === planCode)) return existing;
    if (existing?.status === "PENDING_REVIEW") throw new AppError("PAYMENT_UNDER_REVIEW", "Your payment is already submitted. Contact Zenith to change a paid plan.", 409);
    const profile = user.member ?? user.applicantProfile;
    if (!profile?.address?.trim() || !profile.birthDate) throw new AppError("PROFILE_REQUIRED", "Save your address and birth date before buying a membership.");
    const plan = planForGender(planCode, profile.gender);
    if (!plan) throw new AppError("INVALID_PLAN", "Select a plan matching your profile gender. Contact the front desk if you need help.");
    const balance = user.memberId ? (await tx.pointTransaction.aggregate({ where: { memberId: user.memberId }, _sum: { points: true } }))._sum.points ?? 0 : 0;
    const pointsUsed = user.memberId ? renewalDiscount(balance, plan.discountCap, plan.price) : 0;
    if (existing) await tx.membershipOrder.update({ where:{id:existing.id}, data:{status:"CANCELLED",reviewNote:"Replaced with another plan before payment."} });
    const order = await tx.membershipOrder.create({ data: { userId, kind: user.memberId ? "RENEWAL" : "ADMISSION", planCode: plan.code, planName: plan.name, durationMonths: plan.months, price: plan.price, pointsUsed, amountDue: plan.price - pointsUsed } });
    return order;
  });
}

export async function updateMembershipOrder(userId: string, orderId: string, value: { action: "submit" | "cancel"; utr?: string; reportedAmount?: number; paymentApp?: string }) {
  return serial(async tx => {
    const order = await tx.membershipOrder.findFirst({ where: { id: orderId, userId } });
    if (!order) throw new AppError("NOT_FOUND", "Checkout not found.", 404);
    if (value.action === "cancel") {
      if (order.status === "CANCELLED") return order;
      if (order.status !== "AWAITING_PAYMENT") throw new AppError("REVIEW_REQUIRED", "A submitted payment must be reviewed by the admin. Contact the front desk for refunds.", 409);
      await releasePoints(tx, order);
      return tx.membershipOrder.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
    }
    if (["PENDING_REVIEW", "APPROVED"].includes(order.status) && order.utr === value.utr) return order;
    if (order.status !== "AWAITING_PAYMENT") throw new AppError("CLOSED_ORDER", "This checkout is closed. Contact 9272112745 if money was debited for this order.", 409);
    if (!value.utr || !/^\d{12}$/.test(value.utr)) throw new AppError("INVALID_UTR", "Enter the 12-digit UPI reference number from your payment receipt.");
    // The UTR-only flow confirms the displayed checkout total. Older clients
    // can still report a differing amount, which stays blocked from approval.
    const reportedAmount = value.reportedAmount ?? order.amountDue;
    if (reportedAmount < 1) throw new AppError("INVALID_AMOUNT", "Enter a valid payment amount.");
    if (order.pointsUsed) {
      const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      if (!user.memberId) throw new AppError("MEMBER_REQUIRED", "A renewal requires a gym member.", 409);
      const balance = (await tx.pointTransaction.aggregate({ where: { memberId: user.memberId }, _sum: { points: true } }))._sum.points ?? 0;
      if (balance < order.pointsUsed) throw new AppError("POINTS_CHANGED", "Your points balance changed. Contact Zenith to reconcile this payment before submitting.", 409);
      await tx.pointTransaction.create({ data: { memberId: user.memberId, points: -order.pointsUsed, transactionType: "ADMIN_ADJUSTMENT", referenceKey: `membership-redemption:${order.id}`, description: `Membership renewal discount: ${order.pointsUsed} points / rupees`, businessDate: indiaBusinessDate() } });
    }
    return tx.membershipOrder.update({ where: { id: order.id }, data: { status: "PENDING_REVIEW", utr: value.utr, reportedAmount, paymentApp: value.paymentApp } });
  });
}

async function releasePoints(tx: Prisma.TransactionClient, order: { id: string; userId: string; pointsUsed: number }) {
  const user = await tx.user.findUnique({ where: { id: order.userId } });
  const deduction = await tx.pointTransaction.findUnique({ where: { referenceKey: `membership-redemption:${order.id}` } });
  if (deduction && order.pointsUsed && user?.memberId) await tx.pointTransaction.upsert({ where: { referenceKey: `membership-release:${order.id}` }, update: {}, create: { memberId: user.memberId, points: order.pointsUsed, transactionType: "REVERSAL", referenceKey: `membership-release:${order.id}`, description: `Renewal points returned for ${order.id}`, businessDate: indiaBusinessDate() } });
}

export async function reviewMembershipOrder(adminId: string, orderId: string, decision: "approve" | "reject", note: string) {
  return serial(async tx => {
    const admin = await tx.user.findUnique({ where: { id: adminId } });
    if (!admin?.isActive || admin.role !== "ADMIN") throw new AppError("FORBIDDEN", "Admin access required.", 403);
    const order = await tx.membershipOrder.findUnique({ where: { id: orderId } });
    if (!order) throw new AppError("NOT_FOUND", "Order not found.", 404);
    if (order.status === "APPROVED" && decision === "approve" || order.status === "REJECTED" && decision === "reject") return order;
    if (order.status !== "PENDING_REVIEW") throw new AppError("CONFLICT", "Only submitted payments can be reviewed.", 409);
    if (decision === "reject") {
      if (!note.trim()) throw new AppError("NOTE_REQUIRED", "Explain why this payment is being rejected, including any refund follow-up.");
      await releasePoints(tx, order);
      return tx.membershipOrder.update({ where: { id: orderId }, data: { status: "REJECTED", reviewNote: note, reviewedById: adminId, reviewedAt: new Date() } });
    }
    if (order.reportedAmount !== order.amountDue) throw new AppError("AMOUNT_MISMATCH", "The reported amount differs from the amount due. Resolve the payment with the member before approval.", 409);
    const user = await tx.user.findUniqueOrThrow({ where: { id: order.userId }, include: { applicantProfile: true, member: { include: { memberships: true } } } });
    if (!user.isActive) throw new AppError("INACTIVE", "This account is disabled.", 409);
    await tx.membershipOrder.update({ where: { id: orderId }, data: { reviewedById: adminId } });
    let membershipId: string;
    if (process.env.MEMBERSHIP_SOURCE === "supabase") {
      const rows = await tx.$queryRaw<{ id: string }[]>`SELECT ${appDatabaseObject("approve_app_membership")}(${order.id}::uuid) AS id`;
      membershipId = rows[0].id;
    } else {
      let member = user.member;
      if (!member) {
        const profile = user.applicantProfile;
        if (!profile?.birthDate || !profile.address) throw new AppError("PROFILE_REQUIRED", "The applicant must complete their profile first.");
        const created = await tx.member.create({ data: { admissionId: `ZF-${order.id.slice(0,8).toUpperCase()}`, fullName: user.displayName!, mobileNumber: user.mobileNumber, gender: profile.gender, address: profile.address, birthDate: profile.birthDate } });
        await tx.user.update({ where: { id: user.id }, data: { memberId: created.id } });
        member = { ...created, memberships: [] };
      }
      const periods = authoritativeMemberships(member);
      const latestEnd = periods.reduce<Date | null>((latest, p) => p.endDate && (!latest || p.endDate > latest) ? p.endDate : latest, null);
      const period = membershipPeriod(order.durationMonths, latestEnd, indiaBusinessDate());
      const plan = await tx.membershipPlan.upsert({ where: { planCode: `APP_${order.planCode}` }, update: {}, create: { planCode: `APP_${order.planCode}`, planName: order.planName, durationDays: Math.round((period.end.getTime() - period.start.getTime()) / 86400000) + 1, standardPrice: order.price } });
      const membership = await tx.membership.create({ data: { memberId: member.id, planId: plan.id, planDays: Math.round((period.end.getTime()-period.start.getTime())/86400000)+1, category: order.planCode.startsWith("FEMALE_HAPPY") ? "Female Happy Hours · 10 AM–4 PM" : member.gender, startDate: period.start, endDate: period.end, totalAmount: order.price, discountAmount: order.pointsUsed, finalAmount: order.amountDue, amountPaid: order.amountDue, pendingAmount: 0, paymentStatus: "PAID", paymentMode: "UPI", membershipStatus: period.start > indiaBusinessDate() ? "UPCOMING" : "ACTIVE", sourceSheet: `APP_ORDER:${order.id}`, sourceRow: 1, sourceType: "NEW_ADMISSION", remarks: `${order.kind}; UTR ${order.utr}; verified by ${adminId}` } });
      membershipId = membership.id;
    }
    return tx.membershipOrder.update({ where: { id: orderId }, data: { status: "APPROVED", membershipId, reviewedAt: new Date(), reviewedById: adminId, reviewNote: note || "Payment verified in merchant account." } });
  });
}
