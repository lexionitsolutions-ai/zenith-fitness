import { z } from "zod";
import crypto from "node:crypto";
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

type FcmAccessToken = {
  token: string;
  expiresAt: number;
};

let fcmAccessToken: FcmAccessToken | null = null;

function base64Url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

async function getFcmAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (fcmAccessToken && fcmAccessToken.expiresAt - 60 > now) return fcmAccessToken.token;

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientEmail || !privateKey) {
    throw new AppError("FCM_NOT_CONFIGURED", "Firebase service account credentials are not configured.", 500);
  }

  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64Url(
    JSON.stringify({
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    })
  );
  const signature = crypto.createSign("RSA-SHA256").update(`${header}.${claim}`).sign(privateKey, "base64url");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claim}.${signature}`,
    }),
  });
  const json = await response.json();
  if (!response.ok) throw new AppError("FCM_AUTH_FAILED", json.error_description ?? "Firebase authentication failed.", 500);

  fcmAccessToken = { token: json.access_token, expiresAt: now + Number(json.expires_in ?? 3600) };
  return fcmAccessToken.token;
}

function stringifyData(data: unknown) {
  if (!data || typeof data !== "object" || Array.isArray(data)) return undefined;
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, value == null ? "" : String(value)]));
}

async function sendFcmMessage(token: string, payload: NotificationPayload) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new AppError("FCM_NOT_CONFIGURED", "FIREBASE_PROJECT_ID is not configured.", 500);

  const accessToken = await getFcmAccessToken();
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      message: {
        token,
        notification: {
          title: payload.title,
          body: payload.body ?? undefined,
        },
        data: stringifyData(payload.data),
      },
    }),
  });
  const json = await response.json();
  if (!response.ok) throw new AppError("FCM_SEND_FAILED", json.error?.message ?? "Firebase notification send failed.", 502);
  return json.name as string | undefined;
}

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

export async function sendPendingNotifications(limit = 100) {
  const pending = await prisma.notificationDelivery.findMany({
    where: { status: "PENDING", provider: "FCM", pushDeviceId: { not: null } },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true, pushDeviceId: true, title: true, body: true, data: true },
  });

  const devices = await prisma.pushDevice.findMany({
    where: { id: { in: pending.map((item) => item.pushDeviceId).filter(Boolean) as string[] }, isActive: true },
    select: { id: true, token: true },
  });
  const tokensByDeviceId = new Map(devices.map((device) => [device.id, device.token]));

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const item of pending) {
    const token = item.pushDeviceId ? tokensByDeviceId.get(item.pushDeviceId) : undefined;
    if (!token) {
      skipped += 1;
      await prisma.notificationDelivery.update({ where: { id: item.id }, data: { status: "SKIPPED", errorCode: "DEVICE_INACTIVE" } });
      continue;
    }

    try {
      const providerMessageId = await sendFcmMessage(token, { title: item.title, body: item.body, data: item.data as NotificationPayload["data"] });
      sent += 1;
      await prisma.notificationDelivery.update({ where: { id: item.id }, data: { status: "SENT", providerMessageId, sentAt: new Date() } });
    } catch (error) {
      failed += 1;
      await prisma.notificationDelivery.update({
        where: { id: item.id },
        data: {
          status: "FAILED",
          errorCode: error instanceof AppError ? error.code : "UNKNOWN_ERROR",
          errorMessage: error instanceof Error ? error.message : "Unknown notification error.",
        },
      });
    }
  }

  return { scanned: pending.length, sent, failed, skipped };
}
