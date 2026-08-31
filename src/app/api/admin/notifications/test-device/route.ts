import { requireActiveRole } from "@/lib/auth/authorize";
import { apiError } from "@/lib/errors";
import { ensureOperationalTables } from "@/lib/database/ensure-operational-tables";
import { queueNotificationForUsers, sendPendingNotifications } from "@/services/notification.service";
import { prisma } from "@/lib/database/prisma";

export async function POST() {
  try {
    const session = await requireActiveRole(["ADMIN"]);
    await ensureOperationalTables();

    const devices = await prisma.pushDevice.findMany({
      where: { userId: session.userId, isActive: true },
      orderBy: { lastSeenAt: "desc" },
      select: { id: true, platform: true, provider: true, lastSeenAt: true },
    });

    if (devices.length === 0) {
      return Response.json({
        success: true,
        data: {
          devices: 0,
          queued: 0,
          sent: null,
          warning: "This admin login has no registered notification device. Open the installed Android app, allow notifications, then log out and log in again.",
        },
      });
    }

    const queued = await queueNotificationForUsers([session.userId], {
      title: "Zenith test notification",
      body: "If you can see this, Android push is working on this device.",
      data: { type: "ADMIN_DEVICE_TEST" },
    });
    const sent = queued.queued > 0 ? await sendPendingNotifications(10) : null;

    return Response.json({ success: true, data: { devices: devices.length, queued: queued.queued, sent, latestDevice: devices[0] } });
  } catch (error) {
    return apiError(error);
  }
}
