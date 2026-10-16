import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";
import { AppError, apiError } from "@/lib/errors";

const input = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  gender: z.string().trim().max(40).nullable().optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  address: z.string().trim().max(500).nullable().optional(),
  medicalHistory: z.string().trim().max(1000).nullable().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.memberId) throw new AppError("UNAUTHORIZED", "Authentication required.", 401);
    const value = input.parse(await req.json());
    await prisma.member.update({
      where: { id: session.memberId },
      data: {
        fullName: value.fullName,
        gender: value.gender === undefined ? undefined : value.gender || null,
        birthDate: value.birthDate === undefined ? undefined : value.birthDate ? new Date(`${value.birthDate}T00:00:00Z`) : null,
        address: value.address === undefined ? undefined : value.address || null,
        medicalHistory: value.medicalHistory === undefined ? undefined : value.medicalHistory || null,
      },
    });
    return Response.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
