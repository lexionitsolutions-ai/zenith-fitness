import { getSession } from "@/lib/auth/session";
import { AppError, apiError } from "@/lib/errors";
import { addBmiAssessment, updateBmiAssessment } from "@/services/fitness-target.service";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.memberId) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    return Response.json({ success: true, data: await addBmiAssessment(session.memberId, await req.json()) });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session?.memberId) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    return Response.json({ success: true, data: await updateBmiAssessment(session.memberId, await req.json()) });
  } catch (error) {
    return apiError(error);
  }
}
