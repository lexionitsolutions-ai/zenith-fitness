import { AppError, apiError } from "@/lib/errors";
import { sendPendingNotifications } from "@/services/notification.service";

function authorize(req: Request) {
  const secret = process.env.NOTIFICATION_SEND_SECRET;
  const header = req.headers.get("authorization");

  if (!secret) throw new AppError("NOTIFICATIONS_NOT_CONFIGURED", "NOTIFICATION_SEND_SECRET is not configured.", 500);
  if (header !== `Bearer ${secret}`) throw new AppError("UNAUTHORIZED", "Notification sender access denied.", 401);
}

export async function POST(req: Request) {
  try {
    authorize(req);
    return Response.json({ success: true, data: await sendPendingNotifications() });
  } catch (error) {
    return apiError(error);
  }
}
