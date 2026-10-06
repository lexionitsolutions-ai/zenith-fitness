import { prisma } from "@/lib/database/prisma";
import { AppError } from "@/lib/errors";
import { indiaToday } from "@/lib/visitor";
import { membershipEndDate, membershipStartInput } from "@/lib/membership-dates";
import { sheetText } from "@/lib/sheets/reception";
import { syncSheetsJob } from "./sheets-sync.service";

export async function reviewMembership(id: string, approve: boolean, adminId: string) {
  const jobId = await prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT "id" FROM "MembershipOrder" WHERE "id" = ${id}::uuid FOR UPDATE`;
    const order = await tx.membershipOrder.findUnique({ where: { id }, include: { visitor: true, plan: true } });
    if (!order || !["PENDING", "SUBMITTED"].includes(order.status)) throw new AppError("ALREADY_REVIEWED", "This order is already closed. Refresh the page.", 409);
    if (!approve) {
      await tx.membershipOrder.update({ where: { id }, data: { status: "REJECTED", reviewedById: adminId, reviewedAt: new Date() } });
      return null;
    }
    if (order.status !== "SUBMITTED" || !order.utr) throw new AppError("REFERENCE_REQUIRED", "Submit a transaction reference before approval.");
    const start = order.startDate?.toISOString().slice(0, 10) ?? indiaToday();
    if (!membershipStartInput.safeParse(start).success) throw new AppError("INVALID_START_DATE", "Start date must be today or earlier.");
    const end = membershipEndDate(start, order.durationDays);
    const category = order.category ?? order.plan.category;
    let member;
    if (order.kind === "RENEWAL") {
      if (!order.memberId) throw new AppError("MEMBER_REQUIRED", "This renewal has no linked member.");
      await tx.$queryRaw`SELECT "id" FROM "Member" WHERE "id" = ${order.memberId}::uuid FOR UPDATE`;
      member = await tx.member.findUniqueOrThrow({ where: { id: order.memberId } });
    } else {
      if (!order.visitorId) throw new AppError("VISITOR_REQUIRED", "This admission has no linked visitor.");
      await tx.$queryRaw`SELECT "id" FROM "Visitor" WHERE "id" = ${order.visitorId}::uuid FOR UPDATE`;
      const visitor = await tx.visitor.findUniqueOrThrow({ where: { id: order.visitorId } });
      if (visitor.memberId || await tx.user.findUnique({ where: { mobileNumber: visitor.mobileNumber } }) || await tx.member.findFirst({ where: { mobileNumber: visitor.mobileNumber } })) throw new AppError("ACCOUNT_CONFLICT", "This number already belongs to a member. Resolve the duplicate before approval.", 409);
      member = await tx.member.create({ data: { admissionId: `ONLINE-${order.reference}`, fullName: visitor.fullName, mobileNumber: visitor.mobileNumber, gender: category === "MALE" ? "Male" : category?.startsWith("FEMALE") ? "Female" : null } });
      await tx.user.create({ data: { memberId: member.id, mobileNumber: visitor.mobileNumber, displayName: visitor.fullName, pinHash: visitor.passwordHash, role: "MEMBER", mobileVerified: false } });
      await tx.visitor.update({ where: { id: visitor.id }, data: { memberId: member.id } });
    }
    if (!member.mobileNumber) throw new AppError("MOBILE_REQUIRED", "Add the member's contact number before approval.");
    const remarks = `ZenithApp:${order.reference}; UPI ${order.utr}; ${order.kind}; approved by ${adminId}`;
    const membership = await tx.membership.create({ data: { memberId: member.id, planId: order.planId, planDays: order.durationDays, category, startDate: new Date(`${start}T00:00:00Z`), endDate: new Date(`${end}T00:00:00Z`), totalAmount: order.amount, finalAmount: order.amount, amountPaid: order.amount, pendingAmount: 0, paymentMode: "UPI", paymentStatus: "PAID", membershipStatus: end >= indiaToday() ? "ACTIVE" : "EXPIRED", sourceType: "NEW_ADMISSION", sourceSheet: `ONLINE-${order.reference}`, sourceRow: 1, remarks } });
    await tx.membershipOrder.update({ where: { id }, data: { status: "APPROVED", membershipId: membership.id, reviewedById: adminId, reviewedAt: new Date() } });
    const amount = order.amount.toFixed(2);
    const job = await tx.sheetsSyncJob.create({ data: { key: `ORDER:${id}`, kind: order.kind, payload: {
      action: order.kind === "RENEWAL" ? "saveRenewal" : "admission",
      reference: order.reference, localMemberId: member.id, localMembershipId: membership.id,
      admissionId: member.admissionId, name: sheetText(member.fullName), mobile: member.mobileNumber.replace(/\D/g, "").slice(-10),
      gender: member.gender ?? "", birthDate: member.birthDate?.toISOString().slice(0, 10) ?? "", address: sheetText(member.address), injuries: sheetText(member.medicalHistory),
      category: category === "FEMALE_HAPPY_HOURS" ? "Happy Hours" : "Regular", plan: String(order.durationDays),
      startDate: start, endDate: end, totalAmount: amount, amount, discount: "0", finalAmount: amount,
      amountPaid: amount, pendingAmount: "0", paymentMode: "UPI", paymentStatus: "Paid", remarks,
    } } });
    return job.id;
  });
  return jobId ? await syncSheetsJob(jobId) : null;
}
