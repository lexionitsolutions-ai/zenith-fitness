import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/database/prisma";
import { requireActiveRole } from "@/lib/auth/authorize";
import { AppError } from "@/lib/errors";
import { apiError } from "@/lib/errors";
import { queueNotificationForUsers, sendPendingNotifications } from "@/services/notification.service";

const input = z.object({
  audience: z.enum(["MEMBERS", "STAFF", "ALL"]),
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().min(1).max(500),
  sendNow: z.boolean().default(true),
});

export async function POST(req: Request) {
  try {
    await requireActiveRole(["ADMIN"]);
    const value = input.parse(await req.json());
    const roles = value.audience === "ALL" ? [Role.MEMBER, Role.STAFF] : value.audience === "STAFF" ? [Role.STAFF] : [Role.MEMBER];
    const users = await prisma.user.findMany({ where: { role: { in: roles }, isActive: true }, select: { id: true } });
    const queued = await queueNotificationForUsers(users.map((user) => user.id), { title: value.title, body: value.body, data: { type: "ADMIN_BROADCAST", audience: value.audience } });
    let sent = null;
    let warning = null;
    if (value.sendNow && queued.queued > 0) {
      try {
        sent = await sendPendingNotifications(500);
      } catch (error) {
        warning = error instanceof AppError ? error.message : "Notification queued, but immediate sending failed.";
      }
    }
    return Response.json({ success: true, data: { users: users.length, queued: queued.queued, sent, warning } });
  } catch (error) {
    return apiError(error);
  }
}
