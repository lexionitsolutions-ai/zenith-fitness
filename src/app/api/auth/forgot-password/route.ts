import { z } from "zod";
import { prisma } from "@/lib/database/prisma";
import { apiError } from "@/lib/errors";
import { normalizeIndianMobile } from "@/lib/utils/normalization";
import { ensureOperationalTables } from "@/lib/database/ensure-operational-tables";

const input = z.object({ mobile: z.string().min(1) });

export async function POST(req: Request) {
  try {
    const { mobile } = input.parse(await req.json());
    const normalized = normalizeIndianMobile(mobile);

    if (normalized) {
      await ensureOperationalTables();
      const user = await prisma.user.findUnique({
        where: { mobileNumber: normalized },
        select: { id: true, role: true, isActive: true },
      });

      if (user?.isActive && user.role === "MEMBER") {
        await prisma.$transaction(async (tx) => {
          await tx.user.update({
            where: { id: user.id },
            data: { failedLoginCount: 0, lockedUntil: null },
          });
          const existing = await tx.passwordResetRequest.findFirst({
            where: { userId: user.id, status: "PENDING" },
            select: { id: true },
            orderBy: { createdAt: "desc" },
          });
          if (existing) {
            await tx.passwordResetRequest.update({
              where: { id: existing.id },
              data: { requestedByMobile: normalized },
            });
          } else {
            await tx.passwordResetRequest.create({
              data: { userId: user.id, requestedByMobile: normalized },
            });
          }
        });
      }
    }

    return Response.json({
      success: true,
      data: {
        message:
          "If this mobile number belongs to a member account, please contact the Zenith Fitness front desk to verify your identity and receive a new temporary password.",
      },
    });
  } catch (e) {
    return apiError(e);
  }
}
