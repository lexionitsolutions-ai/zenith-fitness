import { Role } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/database/prisma";
import { requireActiveRole } from "@/lib/auth/authorize";
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
    const sent = value.sendNow ? await sendPendingNotifications(500) : null;
    return Response.json({ success: true, data: { users: users.length, queued: queued.queued, sent } });
  } catch (error) {
    return apiError(error);
  }
}
