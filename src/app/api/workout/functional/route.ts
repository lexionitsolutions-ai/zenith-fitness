import { getSession } from "@/lib/auth/session";
import { AppError, apiError } from "@/lib/errors";
import { createFunctionalBatch, getFunctionalWorkouts } from "@/services/functional-workout.service";
import { ZodError } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!await getSession()) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    return Response.json({ success: true, data: await getFunctionalWorkouts() }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    const batch = await createFunctionalBatch(session, await request.json());
    return Response.json({ success: true, data: batch }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return apiError(new AppError("INVALID_BATCH", error.issues[0]?.message ?? "Check the batch details.", 400));
    if (error instanceof SyntaxError) return apiError(new AppError("INVALID_BATCH", "Send valid batch details.", 400));
    return apiError(error);
  }
}
