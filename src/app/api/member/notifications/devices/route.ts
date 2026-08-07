import { getSession } from "@/lib/auth/session";
import { AppError, apiError } from "@/lib/errors";
import { registerPushDevice, unregisterPushDevice } from "@/services/notification.service";

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.memberId) throw new AppError("UNAUTHORIZED", "Member login required.", 401);
    const data = await registerPushDevice(session.userId, await req.json());
    return Response.json({ success: true, data: { id: data.id, platform: data.platform, provider: data.provider } });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getSession();
    if (!session?.memberId) throw new AppError("UNAUTHORIZED", "Member login required.", 401);
    return Response.json({ success: true, data: await unregisterPushDevice(session.userId, await req.json()) });
  } catch (error) {
    return apiError(error);
  }
}
