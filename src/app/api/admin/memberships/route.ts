import { z } from "zod";
import { prisma } from "@/lib/database/prisma";
import { requireActiveRole } from "@/lib/auth/authorize";
import { AppError, apiError } from "@/lib/errors";
import { reviewMembershipOrder } from "@/services/membership-purchase.service";
export async function GET() {
  try {
    await requireActiveRole(["ADMIN"]);
    const orders = await prisma.membershipOrder.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { user: { select: { displayName: true, mobileNumber: true, applicantProfile: true, member: { select: { admissionId: true, fullName: true, gender: true, address: true, birthDate: true } } } } } });
    return Response.json({ success: true, data: orders });
  } catch (e) { return apiError(e); }
}
export async function POST(req: Request) {
  try {
    const s = await requireActiveRole(["ADMIN"]);
    const v = z.object({ id: z.string().uuid(), decision: z.enum(["approve", "reject"]), note: z.string().trim().max(1000), verified: z.boolean() }).parse(await req.json());
    if (v.decision === "approve" && !v.verified) throw new AppError("VERIFY_PAYMENT", "Confirm the UTR, amount and recipient against the merchant bank statement first.");
    await reviewMembershipOrder(s.userId, v.id, v.decision, v.note);
    return Response.json({ success: true });
  } catch (e) { return apiError(e instanceof z.ZodError ? new AppError("INVALID_INPUT", "Check the review details.") : e); }
}
