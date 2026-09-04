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
          { mobileNumber: digits.length >= 10 ? { endsWith: digits.slice(-10) } : undefined },
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
        },
        pointTransactions: { select: { points: true } },
      },
    });
    if (!member) throw new AppError("MEMBER_NOT_FOUND", "Member not found.", 404);
    const { pointTransactions, ...profile } = member;
    return Response.json({
      success: true,
      data: { ...profile, pointsBalance: pointTransactions.reduce((sum, row) => sum + row.points, 0) },
    });
  } catch (error) {
    return apiError(error);
  }
}
