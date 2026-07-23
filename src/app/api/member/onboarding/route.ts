import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/database/prisma";
import { createSession, getSession } from "@/lib/auth/session";
import { apiError } from "@/lib/errors";
import { AppError } from "@/lib/errors";

const input = z.object({
  password: z.string().min(8).max(128).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

function parseBirthDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  const earliest = new Date("1900-01-01T00:00:00.000Z");
  const today = new Date();
  today.setUTCHours(23, 59, 59, 999);
  if (
    Number.isNaN(date.valueOf()) ||
    date.toISOString().slice(0, 10) !== value ||
    date < earliest ||
    date > today
  ) {
    throw new AppError("INVALID_BIRTH_DATE", "Enter a valid birth date.", 400);
  }
  return date;
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session?.memberId || session.role !== "MEMBER") {
      throw new AppError("UNAUTHORIZED", "Member login required.", 401);
    }

    const values = input.parse(await req.json());
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { member: { select: { id: true, birthDate: true } } },
    });
    if (!user?.member) throw new AppError("MEMBER_NOT_FOUND", "Member profile not found.", 404);

    if (user.mustChangePassword) {
      if (!values.password) {
        throw new AppError("PASSWORD_REQUIRED", "Create your new password.", 400);
      }
      if (values.password === "123456789") {
        throw new AppError("TEMPORARY_PASSWORD", "Choose a password different from the temporary password.", 400);
      }
      if (!/[A-Za-z]/.test(values.password) || !/\d/.test(values.password)) {
        throw new AppError("WEAK_PASSWORD", "Password must include at least one letter and one number.", 400);
      }
    }

    let birthDate: Date | undefined;
    if (!user.member.birthDate) {
      if (!values.birthDate) {
        throw new AppError("BIRTH_DATE_REQUIRED", "Enter your birth date.", 400);
      }
      birthDate = parseBirthDate(values.birthDate);
    }

    const pinHash = user.mustChangePassword
      ? await bcrypt.hash(values.password!, 12)
      : undefined;

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          ...(pinHash ? { pinHash, mustChangePassword: false } : {}),
        },
      }),
      ...(birthDate
        ? [
            prisma.member.update({
              where: { id: user.member.id },
              data: { birthDate },
            }),
          ]
        : []),
    ]);

    await createSession({
      userId: user.id,
      memberId: user.member.id,
      role: user.role,
      onboardingRequired: false,
    });
    return Response.json({ success: true, data: { redirectTo: "/dashboard" } });
  } catch (error) {
    return apiError(error);
  }
}
