import { z } from "zod";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/database/prisma";
import { AppError } from "@/lib/errors";

export const pushDeviceSchema = z.object({
  token: z.string().trim().min(20).max(4096),
  platform: z.enum(["IOS", "ANDROID", "WEB"]),
  provider: z.enum(["FCM", "APNS", "EXPO", "WEB_PUSH"]).default("FCM"),
  deviceId: z.string().trim().max(200).optional(),
  appVersion: z.string().trim().max(40).optional(),
});

export const unregisterPushDeviceSchema = z.object({
  token: z.string().trim().min(20).max(4096),
});

type NotificationPayload = {
  title: string;
  body?: string | null;
  data?: Record<string, string | number | boolean | null>;
};

export async function registerPushDevice(userId: string, input: unknown) {
  const device = pushDeviceSchema.parse(input);
  return prisma.pushDevice.upsert({
    where: { token: device.token },
    create: { ...device, userId },
    update: { ...device, userId, isActive: true, lastSeenAt: new Date() },
  });
}

export async function unregisterPushDevice(userId: string, input: unknown) {
  const { token } = unregisterPushDeviceSchema.parse(input);
  const result = await prisma.pushDevice.updateMany({
    where: { userId, token },
    data: { isActive: false },
  });
  if (result.count === 0) throw new AppError("DEVICE_NOT_FOUND", "Notification device was not found.", 404);
  return { disabled: result.count };
}

export async function queueNotificationForUsers(userIds: string[], payload: NotificationPayload) {
  const uniqueUserIds = [...new Set(userIds)];
  if (uniqueUserIds.length === 0) return { queued: 0 };

  const devices = await prisma.pushDevice.findMany({
    where: { userId: { in: uniqueUserIds }, isActive: true },
    select: { id: true, userId: true, provider: true },
  });

  if (devices.length === 0) return { queued: 0 };

  await prisma.notificationDelivery.createMany({
    data: devices.map((device) => ({
      userId: device.userId,
      pushDeviceId: device.id,
      provider: device.provider,
      title: payload.title,
      body: payload.body ?? null,
      data: payload.data,
      status: "PENDING",
    })),
  });

  return { queued: devices.length };
}

export async function queueAnnouncementNotification(announcement: { id: string; title: string; message: string | null; startsAt: Date }) {
  const now = new Date();
  if (announcement.startsAt > now) return { queued: 0 };

  const members = await prisma.user.findMany({
    where: { role: Role.MEMBER, isActive: true },
    select: { id: true },
  });

  return queueNotificationForUsers(
    members.map((member) => member.id),
    {
      title: announcement.title,
      body: announcement.message ?? "New announcement from Zenith Fitness.",
      data: { type: "ANNOUNCEMENT", announcementId: announcement.id },
    }
  );
}
