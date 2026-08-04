import { getSession } from "@/lib/auth/session";
import { AppError, apiError } from "@/lib/errors";
import { completeExercise, setCurrentDay } from "@/services/workout.service";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.memberId) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    await completeExercise(session.userId, await request.json());
    return Response.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session?.memberId) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    const body = await request.json();
    await setCurrentDay(session.userId, Number(body.dayNumber));
    return Response.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
