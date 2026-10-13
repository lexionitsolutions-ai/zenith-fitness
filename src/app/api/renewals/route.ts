import { z } from "zod";
import { requireRenewalMember } from "@/lib/auth/renewal-member";
import { createRenewal, submitRenewal, cancelRenewal, serializeRenewal } from "@/services/renewal.service";
import { submitRenewalInput } from "@/lib/renewals";
import { AppError, apiError } from "@/lib/errors";
function error(e: unknown) { return apiError(e instanceof z.ZodError ? new AppError("INVALID_INPUT", e.issues[0].message) : e); }
export async function POST(request: Request) {
  try { const memberId = await requireRenewalMember(); const { planCode } = z.object({ planCode: z.string().max(60) }).strict().parse(await request.json()); return Response.json({ data: serializeRenewal(await createRenewal(memberId, planCode)) }); } catch (e) { return error(e); }
}
export async function PATCH(request: Request) {
  try { const memberId = await requireRenewalMember(); const { id, utr } = submitRenewalInput.parse(await request.json()); return Response.json({ data: serializeRenewal(await submitRenewal(memberId, id, utr)) }); } catch (e) { return error(e); }
}
export async function DELETE(request: Request) {
  try { const memberId = await requireRenewalMember(); const { id } = z.object({ id: z.string().uuid() }).strict().parse(await request.json()); await cancelRenewal(memberId, id); return Response.json({ success: true }); } catch (e) { return error(e); }
}
