import { getSession } from "@/lib/auth/session";
import { AppError, apiError } from "@/lib/errors";
import { createFunctionalVideo } from "@/services/functional-workout.service";
import { ZodError } from "zod";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    const video = await createFunctionalVideo(session, await request.json());
    return Response.json({ success: true, data: video }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return apiError(new AppError("INVALID_VIDEO", error.issues[0]?.message ?? "Check the video details.", 400));
    if (error instanceof SyntaxError) return apiError(new AppError("INVALID_VIDEO", "Send valid video details.", 400));
    return apiError(error);
  }
}
