import { z } from "zod";
import { prisma } from "@/lib/database/prisma";
import { requireActiveRole } from "@/lib/auth/authorize";
import { AppError, apiError } from "@/lib/errors";

const input = z.object({
  id: z.string().uuid().optional(),
  day: z.coerce.number().int().min(0).max(6),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  name: z.string().trim().min(2).max(80),
});

export async function POST(req: Request) {
  try {
    await requireActiveRole(["ADMIN"]);
    const value = input.parse(await req.json());
    const row = value.id
      ? await prisma.scheduleSession.update({ where: { id: value.id }, data: { day: value.day, time: value.time, name: value.name, isActive: true } })
      : await prisma.scheduleSession.create({ data: { day: value.day, time: value.time, name: value.name } });
    return Response.json({ success: true, data: row });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(req: Request) {
  try {
    await requireActiveRole(["ADMIN"]);
    const id = z.string().uuid().parse(new URL(req.url).searchParams.get("id"));
    const result = await prisma.scheduleSession.updateMany({ where: { id }, data: { isActive: false } });
    if (result.count === 0) throw new AppError("SCHEDULE_NOT_FOUND", "Schedule session not found.", 404);
    return Response.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
