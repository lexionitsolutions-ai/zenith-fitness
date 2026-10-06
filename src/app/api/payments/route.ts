import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/database/prisma";
import { paymentOwner, currentPaymentOwner } from "@/lib/auth/payment-owner";
import { apiError, AppError } from "@/lib/errors";
import { indiaToday, upiPaymentUri } from "@/lib/visitor";
import { membershipEndDate, membershipStartInput } from "@/lib/membership-dates";
const input = z.object({ planId: z.string().uuid(), kind: z.enum(["ADMISSION", "RENEWAL"]).default("ADMISSION"), startDate: membershipStartInput.optional() }).strict();
export async function POST(req: Request) {
  try {
    const parsed = input.safeParse(await req.json());
    if (!parsed.success) throw new AppError("INVALID_INPUT", parsed.error.issues[0].message);
    const v = parsed.data;
    const owner = await paymentOwner(v.kind);
    const startDate = v.startDate ?? indiaToday();
    const order = await prisma.$transaction(async tx => {
      if (owner.visitorId) {
        const rows = await tx.$queryRaw<{ memberId: string | null }[]>`SELECT "id", "memberId" FROM "Visitor" WHERE "id" = ${owner.visitorId}::uuid FOR UPDATE`;
        if (rows[0]?.memberId) throw new AppError("ALREADY_MEMBER", "Use member login to renew.");
      } else await tx.$queryRaw`SELECT "id" FROM "Member" WHERE "id" = ${owner.memberId}::uuid FOR UPDATE`;
      const plan = await tx.membershipPlan.findUnique({ where: { id: v.planId } });
      if (!plan?.isActive || !plan.standardPrice || plan.standardPrice.toNumber() <= 0 || plan.durationDays <= 0) throw new AppError("PLAN_UNAVAILABLE", "This plan is not available for online purchase yet.");
      const pending = await tx.membershipOrder.findFirst({ where: { ...owner, status: { in: ["PENDING", "SUBMITTED"] } } });
      if (pending) {
        if (pending.planId !== plan.id || pending.startDate?.toISOString().slice(0, 10) !== startDate) throw new AppError("PENDING_ORDER", "You already have an open payment. Continue it or ask the gym to cancel it before changing the plan or date.", 409);
        return pending;
      }
      return tx.membershipOrder.create({ data: { ...owner, kind: v.kind, category: plan.category, startDate: new Date(`${startDate}T00:00:00Z`), planId: plan.id, planName: plan.planName, durationDays: plan.durationDays, amount: plan.standardPrice, reference: `ZF${randomUUID().replaceAll("-", "")}` } });
    });
    const start = order.startDate?.toISOString().slice(0, 10) ?? startDate;
    return Response.json({ success: true, data: { ...order, startDate: start, endDate: membershipEndDate(start, order.durationDays), amount: order.amount.toFixed(2), upiUri: upiPaymentUri(order.amount.toFixed(2), order.reference) } });
  } catch (e) { return apiError(e); }
}
export async function PATCH(req: Request) {
  try {
    const owner = await currentPaymentOwner();
    const v = z.object({ orderId: z.string().uuid(), utr: z.string().trim().regex(/^\d{12}$/, "Enter the 12-digit UPI transaction reference (UTR).") }).strict().safeParse(await req.json());
    if (!v.success) throw new AppError("INVALID_INPUT", v.error.issues[0].message);
    const result = await prisma.membershipOrder.updateMany({ where: { id: v.data.orderId, ...owner, status: "PENDING" }, data: { utr: v.data.utr, status: "SUBMITTED" } });
    if (!result.count) throw new AppError("ORDER_UNAVAILABLE", "This payment has already been submitted or closed.", 409);
    return Response.json({ success: true });
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2002") return apiError(new AppError("DUPLICATE_REFERENCE", "This transaction reference has already been submitted.", 409));
    return apiError(e);
  }
}
