import { getSession } from "@/lib/auth/session";
import { AppError, apiError } from "@/lib/errors";
import { getActiveWorkout, replaceWorkoutGoal, selectWorkoutGoal } from "@/services/workout.service";

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.memberId) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    return Response.json({ success: true, data: await getActiveWorkout(session.userId) });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.memberId) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    await selectWorkoutGoal(session.userId, await request.json());
    return Response.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session?.memberId) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    await replaceWorkoutGoal(session.userId, await request.json());
    return Response.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
