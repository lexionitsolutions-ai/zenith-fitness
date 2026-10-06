import { z } from "zod";
import { prisma } from "@/lib/database/prisma";
import { requireActiveRole } from "@/lib/auth/authorize";
import { apiError, AppError } from "@/lib/errors";
import { reviewMembership } from "@/services/membership-approval.service";
import { syncSheetsJob } from "@/services/sheets-sync.service";
export const maxDuration = 90;
const input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("price"), planId: z.string().uuid(), price: z.string().regex(/^\d{1,8}(\.\d{1,2})?$/).refine(v => Number(v) > 0), isActive: z.boolean() }),
  z.object({ action: z.literal("enquiry"), id: z.string().uuid(), status: z.enum(["NEW", "CONTACTED", "COMPLETED"]) }),
  z.object({ action: z.literal("review"), id: z.string().uuid(), approve: z.boolean() }),
  z.object({ action: z.literal("sync"), id: z.string().uuid(), confirmedMissing: z.boolean().default(false) }),
]);
export async function PATCH(req: Request) {
  try {
    const admin = await requireActiveRole(["ADMIN"]);
    const parsed = input.safeParse(await req.json());
    if (!parsed.success) throw new AppError("INVALID_INPUT", "Check the price or selected record.");
    const v = parsed.data;
    let sheetsStatus: string | null = null;
    if (v.action === "price") await prisma.membershipPlan.update({ where: { id: v.planId }, data: { standardPrice: v.price, isActive: v.isActive } });
    else if (v.action === "enquiry") await prisma.trialEnquiry.update({ where: { id: v.id }, data: { status: v.status } });
    else if (v.action === "sync") sheetsStatus = await syncSheetsJob(v.id, v.confirmedMissing);
    else sheetsStatus = await reviewMembership(v.id, v.approve, admin.userId);
    return Response.json({ success: true, sheetsStatus });
  } catch (e) { return apiError(e); }
}
