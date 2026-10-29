import { z } from "zod";
import { requireActiveRole } from "@/lib/auth/authorize";
import { AppError, apiError } from "@/lib/errors";
import { createMembershipOrder, purchaseOverview, updateMembershipOrder } from "@/services/membership-purchase.service";
export async function GET() {
  try { const s = await requireActiveRole(["MEMBER"]); return Response.json({ success: true, data: await purchaseOverview(s.userId) }); }
  catch (e) { return apiError(e); }
}
export async function POST(req: Request) {
  try {
    const s = await requireActiveRole(["MEMBER"]);
    const v = z.object({ planCode: z.string().max(40), replaceExisting:z.boolean().optional() }).parse(await req.json());
    const order = await createMembershipOrder(s.userId, v.planCode, v.replaceExisting ?? false);
    return Response.json({ success: true, data: { orderId:order.id, checkoutUrl:`/membership/checkout/${order.id}` } });
  } catch (e) { return apiError(e instanceof z.ZodError ? new AppError("INVALID_INPUT", "Select a valid membership plan.") : e); }
}
export async function PATCH(req: Request) {
  try {
    const s = await requireActiveRole(["MEMBER"]);
    const v = z.object({ id: z.string().uuid(), action: z.enum(["submit", "cancel"]), utr: z.string().trim().max(40).optional(), reportedAmount: z.number().int().min(1).max(100000).optional(), paymentApp: z.enum(["Any UPI app", "Google Pay", "PhonePe", "Paytm", "QR / manual transfer"]).optional() }).parse(await req.json());
    const order = await updateMembershipOrder(s.userId, v.id, v);
    const overview = v.action === "submit" ? await purchaseOverview(s.userId) : null;
    return Response.json({ success: true, data: { orderId:order.id, whatsappUrl:overview?.orders.find(o=>o.id===order.id)?.whatsappUrl ?? null } });
  } catch (e) { return apiError(e instanceof z.ZodError ? new AppError("INVALID_INPUT", "Check your payment reference and amount.") : e); }
}
