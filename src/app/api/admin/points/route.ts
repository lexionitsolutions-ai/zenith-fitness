import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";
import { indiaBusinessDate } from "@/services/points.service";
import { AppError, apiError } from "@/lib/errors";

const input = z.object({
  memberId: z.string().uuid(),
  points: z.number().int().min(-10000).max(10000).refine((value) => value !== 0),
  description: z.string().min(3).max(200),
});

async function requireAdmin() {
  const session = await getSession();
  if (session?.role !== "ADMIN") {
    throw new AppError("FORBIDDEN", "Administrator access required.", 403);
  }
  return session;
}

export async function GET() {
  try {
    await requireAdmin();
    const transactions = await prisma.pointTransaction.findMany({
      take: 100,
      orderBy: { createdAt: "desc" },
      include: {
        member: { select: { fullName: true, admissionId: true } },
        awardedBy: { select: { mobileNumber: true, role: true } },
      },
    });
    return Response.json({ success: true, data: transactions });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAdmin();
    const value = input.parse(await request.json());
    const transaction = await prisma.pointTransaction.create({
      data: {
        ...value,
        transactionType: value.points > 0 ? "ADMIN_ADJUSTMENT" : "REVERSAL",
        awardedByUserId: session.userId,
        businessDate: indiaBusinessDate(),
      },
    });
    return Response.json({ success: true, data: transaction });
  } catch (error) {
    return apiError(error);
  }
}
