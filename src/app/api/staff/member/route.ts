import { requireActiveRole } from "@/lib/auth/authorize";
import { prisma } from "@/lib/database/prisma";
import { AppError, apiError } from "@/lib/errors";
import { normalizeAdmissionId } from "@/lib/utils/normalization";

export async function GET(req: Request) {
  try {
    await requireActiveRole(["STAFF", "ADMIN"]);
    const query = new URL(req.url).searchParams.get("q")?.trim().toUpperCase();
    if (!query) throw new AppError("SEARCH_REQUIRED", "Enter an Admission ID or mobile number.");
    const digits = query.replace(/\D/g, "");
    const normalizedAdmissionId = normalizeAdmissionId(query);
    const admissionId =
      normalizedAdmissionId && /^\d+$/.test(normalizedAdmissionId)
        ? `ZF-${normalizedAdmissionId}`
        : normalizedAdmissionId?.replace(/^ZF-?(\d+)$/, "ZF-$1");
    const member = await prisma.member.findFirst({
      where: {
        OR: [
          { admissionId: admissionId ?? query },
          ...(digits.length >= 10 ? [{ mobileNumber: { endsWith: digits.slice(-10) } }] : []),
        ],
      },
      select: {
        id: true,
        admissionId: true,
        fullName: true,
        mobileNumber: true,
        targets: {
          where: { status: { in: ["ASSIGNED", "IN_PROGRESS"] } },
          orderBy: { dueDate: "asc" },
          select: { id: true, title: true, dueDate: true, rewardPoints: true },
        },
      },
    });
    if (!member) throw new AppError("MEMBER_NOT_FOUND", "Member not found.", 404);
    const balance = await prisma.pointTransaction.aggregate({ where: { memberId: member.id }, _sum: { points: true } });
    return Response.json({
      success: true,
      data: { ...member, pointsBalance: balance._sum.points ?? 0 },
    });
  } catch (error) {
    return apiError(error);
  }
}
