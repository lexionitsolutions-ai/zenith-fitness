import { z } from "zod";
import { requireActiveRole } from "@/lib/auth/authorize";
import { reviewRenewal } from "@/services/renewal.service";
import { syncRenewalSheetsJob } from "@/services/renewal-sheets.service";
import { AppError, apiError } from "@/lib/errors";
const input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve"), id: z.string().uuid(), paymentVerified: z.literal(true) }).strict(),
  z.object({ action: z.literal("reject"), id: z.string().uuid(), reason: z.string().trim().min(3).max(300) }).strict(),
  z.object({ action: z.literal("sync"), id: z.string().uuid(), confirmedMissing: z.boolean().optional() }).strict(),
]);
export async function POST(request: Request) {
  try {
    const admin = await requireActiveRole(["ADMIN"]); const data = input.parse(await request.json());
    const status = data.action === "sync" ? await syncRenewalSheetsJob(data.id, data.confirmedMissing ?? false) : await reviewRenewal(data.id, data.action === "approve", admin.userId, data.action === "reject" ? data.reason : undefined);
    return Response.json({ success: true, syncStatus: status });
  } catch (e) { return apiError(e instanceof z.ZodError ? new AppError("INVALID_INPUT", e.issues[0].message) : e); }
}

export const maxDuration = 60;
