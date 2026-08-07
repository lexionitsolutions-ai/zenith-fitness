import { z } from "zod";
import { requireActiveRole } from "@/lib/auth/authorize";
import { prisma } from "@/lib/database/prisma";
import { awardDailyVisit } from "@/services/points.service";
import { AppError, apiError } from "@/lib/errors";

const schema = z.object({ qrToken: z.string().uuid() });

export async function GET(req: Request) {
  try {
    await requireActiveRole(["STAFF", "ADMIN"]);
    const qrToken = schema.parse({ qrToken: new URL(req.url).searchParams.get("qrToken") }).qrToken;
    const member = await prisma.member.findUnique({
      where: { qrToken },
      select: { admissionId: true, fullName: true, qrCodeActive: true },
    });
    if (!member || !member.qrCodeActive) throw new AppError("INVALID_QR", "Member QR code is invalid.", 404);
    return Response.json({ success: true, data: { admissionId: member.admissionId, name: member.fullName } });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireActiveRole(["STAFF", "ADMIN"]);
    const { qrToken } = schema.parse(await req.json());
    return Response.json({ success: true, data: await awardDailyVisit(qrToken, session.userId) });
  } catch (error) {
    return apiError(error);
  }
}
