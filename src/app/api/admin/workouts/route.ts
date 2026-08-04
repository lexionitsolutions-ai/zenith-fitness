import { Role } from "@prisma/client";
import { requireActiveRole } from "@/lib/auth/authorize";
import { apiError } from "@/lib/errors";
import { adminAssignWorkout, adminUpdateExercise, getAdminWorkoutConsole } from "@/services/workout.service";

export async function GET() {
  try {
    await requireActiveRole([Role.ADMIN]);
    return Response.json({ success: true, data: await getAdminWorkoutConsole() });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireActiveRole([Role.ADMIN]);
    await adminAssignWorkout(session.userId, await request.json());
    return Response.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    await requireActiveRole([Role.ADMIN]);
    await adminUpdateExercise(await request.json());
    return Response.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
