import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/database/prisma";
import { requireActiveRole } from "@/lib/auth/authorize";
import { AppError, apiError } from "@/lib/errors";

const input = z.object({
  q: z.string().trim().min(1),
  password: z.string().min(8).max(128),
  requestId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await requireActiveRole(["ADMIN", "STAFF"]);
    const value = input.parse(await req.json());
    if (!/[A-Za-z]/.test(value.password) || !/\d/.test(value.password)) {
      throw new AppError("WEAK_PASSWORD", "Temporary password must include at least one letter and one number.", 400);
    }

    const query = value.q.trim().toUpperCase();
    const digits = query.replace(/\D/g, "");
    const user = await prisma.user.findFirst({
      where: {
        role: "MEMBER",
        member: {
          OR: [
            { admissionId: query },
            { mobileNumber: digits.length >= 10 ? { endsWith: digits.slice(-10) } : undefined },
          ],
        },
      },
      select: {
        id: true,
        member: { select: { fullName: true, admissionId: true } },
      },
    });

    if (!user) throw new AppError("MEMBER_NOT_FOUND", "Member account not found.", 404);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          pinHash: await bcrypt.hash(value.password, 12),
          mustChangePassword: true,
          failedLoginCount: 0,
          lockedUntil: null,
        },
      });
      await tx.passwordResetRequest.updateMany({
        where: {
          userId: user.id,
          status: "PENDING",
          ...(value.requestId ? { id: value.requestId } : {}),
        },
        data: {
          status: "COMPLETED",
          handledById: session.userId,
          handledAt: new Date(),
        },
      });
    });

    return Response.json({
      success: true,
      data: {
        message: `Temporary password set for ${user.member?.fullName ?? "member"} (${user.member?.admissionId ?? "no admission ID"}).`,
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
