import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";
import { AppError, apiError } from "@/lib/errors";
import { queueAnnouncementNotification, sendPendingNotifications } from "@/services/notification.service";

const IST_OFFSET_MINUTES = 330;

const rawSchema = z
  .object({
    title: z.string().trim().min(2).max(100),
    message: z.string().trim().max(1000).optional(),
    imageData: z
      .string()
      .max(2_800_000)
      .refine((value) => !value || /^data:image\/(jpeg|png|webp);base64,/.test(value), "Use a JPEG, PNG, or WebP image")
      .optional(),
    startsAt: z.string().min(1),
    endsAt: z.string().nullable().optional(),
  })
  .refine((value) => Boolean(value.message || value.imageData), { message: "Add text or an image" });

function parseAdminDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return new Date(value);

  const [, year, month, day, hour, minute] = match.map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - IST_OFFSET_MINUTES * 60_000);
}

function parseAnnouncementInput(input: unknown) {
  const value = rawSchema.parse(input);
  const data = {
    ...value,
    startsAt: parseAdminDate(value.startsAt),
    endsAt: value.endsAt ? parseAdminDate(value.endsAt) : null,
  };

  if (Number.isNaN(data.startsAt.valueOf()) || Number.isNaN(data.endsAt?.valueOf() ?? 0)) {
    throw new AppError("INVALID_DATE", "Use a valid announcement date and time.", 400);
  }
  if (data.endsAt && data.endsAt <= data.startsAt) {
    throw new AppError("INVALID_DATE", "End time must be after start time.", 400);
  }

  return data;
}

async function admin() {
  const session = await getSession();
  if (session?.role !== "ADMIN") throw new AppError("FORBIDDEN", "Administrator access required.", 403);
  return session;
}

export async function GET() {
  try {
    await admin();
    const data = await prisma.announcement.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
    return Response.json({ success: true, data });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await admin();
    const value = parseAnnouncementInput(await req.json());
    const data = await prisma.announcement.create({ data: { ...value, createdById: session.userId } });
    const queued = await queueAnnouncementNotification(data);
    let delivery = null;

    try {
      delivery = await sendPendingNotifications();
    } catch (error) {
      console.error("Announcement notification delivery failed", error);
    }

    return Response.json({ success: true, data: { ...data, notifications: { queued: queued.queued, delivery } } });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(req: Request) {
  try {
    await admin();
    const id = z.string().uuid().parse(new URL(req.url).searchParams.get("id"));
    const data = await prisma.announcement.update({ where: { id }, data: { isActive: false } });
    return Response.json({ success: true, data });
  } catch (error) {
    return apiError(error);
  }
}
