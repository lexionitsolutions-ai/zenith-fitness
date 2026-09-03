import { getSession } from "@/lib/auth/session";
import { AppError, apiError } from "@/lib/errors";
import { createFitnessTarget, getFitnessTarget, updateFitnessTarget } from "@/services/fitness-target.service";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.memberId) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    return Response.json({ success: true, data: await getFitnessTarget(session.memberId) });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.memberId) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    return Response.json({ success: true, data: await createFitnessTarget(session.memberId, await req.json()) });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session?.memberId) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    return Response.json({ success: true, data: await updateFitnessTarget(session.memberId, await req.json()) });
  } catch (error) {
    return apiError(error);
  }
}
