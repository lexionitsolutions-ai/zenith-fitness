import { Role } from "@prisma/client";
import { requireActiveRole } from "@/lib/auth/authorize";
import { apiError } from "@/lib/errors";
import { adminAddWorkoutCardExercise, adminAssignWorkout, adminCreateExercise, adminDeleteWorkoutCardExercise, adminUpdateExercise, getAdminWorkoutConsole } from "@/services/workout.service";

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
    const input = await request.json();
    if (input?.intent === "createExercise") {
      await adminCreateExercise(input);
    } else if (input?.intent === "addWorkoutCardExercise") {
      await adminAddWorkoutCardExercise(input);
    } else {
      await adminAssignWorkout(session.userId, input);
    }
    return Response.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireActiveRole([Role.ADMIN]);
    await adminDeleteWorkoutCardExercise(await request.json());
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
