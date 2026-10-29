import { z } from "zod";
import { prisma } from "@/lib/database/prisma";
import { requireActiveRole } from "@/lib/auth/authorize";
import { AppError, apiError } from "@/lib/errors";
export async function POST(req: Request) {
  try {
    const s = await requireActiveRole(["MEMBER"]);
    const v = z.object({ address: z.string().trim().min(5).max(500), birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).parse(await req.json());
    const birthDate = new Date(`${v.birthDate}T00:00:00Z`);
    if (isNaN(birthDate.getTime()) || birthDate.toISOString().slice(0,10) !== v.birthDate || birthDate > new Date() || birthDate < new Date("1900-01-01")) throw new AppError("INVALID_DATE", "Enter a valid birth date.");
    const user = await prisma.user.findUniqueOrThrow({ where: { id: s.userId } });
    if (user.memberId) await prisma.member.update({ where: { id: user.memberId }, data: { address: v.address, birthDate } });
    else await prisma.applicantProfile.update({ where: { userId: s.userId }, data: { address: v.address, birthDate } });
    return Response.json({ success: true });
  } catch (e) { return apiError(e instanceof z.ZodError ? new AppError("INVALID_INPUT", "Enter your address and birth date.") : e); }
}
