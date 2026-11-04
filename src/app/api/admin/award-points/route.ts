import { z } from "zod";
import { requireActiveRole } from "@/lib/auth/authorize";
import { prisma } from "@/lib/database/prisma";
import { AppError, apiError } from "@/lib/errors";
import { indiaBusinessDate } from "@/lib/utils/point-rules";
import { normalizeAdmissionId } from "@/lib/utils/normalization";

const awardInput = z.object({
  batchId: z.string().uuid(),
  memberIds: z.array(z.string().uuid()).min(1).max(200),
  points: z.number().int().min(1).max(10000),
  description: z.string().trim().min(3).max(200),
});

export async function GET(request: Request) {
  try {
    await requireActiveRole(["ADMIN"]);
    const query = z.string().trim().min(1).max(100).parse(new URL(request.url).searchParams.get("q"));
    const normalized = normalizeAdmissionId(query);
    const admissionId = normalized && /^\d+$/.test(normalized) ? `ZF-${normalized}` : normalized?.replace(/^ZF-?(\d+)$/, "ZF-$1");
    const digits = query.replace(/\D/g, "");
    const members = await prisma.member.findMany({
      where: { OR: [
        { fullName: { contains: query, mode: "insensitive" } },
        { admissionId: { contains: query, mode: "insensitive" } },
        ...(admissionId ? [{ admissionId }] : []),
        ...(digits.length >= 3 ? [{ mobileNumber: { contains: digits } }] : []),
      ] },
      select: { id: true, fullName: true, admissionId: true },
      orderBy: [{ fullName: "asc" }, { id: "asc" }],
      take: 30,
    });
    return Response.json({ success: true, data: members });
  } catch (error) { return apiError(error instanceof z.ZodError ? new AppError("INVALID_INPUT", "Enter a member name, ID, or mobile number (up to 100 characters).") : error); }
}

export async function POST(request: Request) {
  try {
    const session = await requireActiveRole(["ADMIN"]);
    const value = awardInput.parse(await request.json());
    const memberIds = [...new Set(value.memberIds)];
    const businessDate = indiaBusinessDate();
    const result = await prisma.$transaction(async (tx) => {
      const count = await tx.member.count({ where: { id: { in: memberIds } } });
      if (count !== memberIds.length) throw new AppError("MEMBER_NOT_FOUND", "One or more selected members no longer exist. Refresh and select them again.", 404);
      // A retry of the same batch cannot award the same member twice.
      return tx.pointTransaction.createMany({
        data: memberIds.map(memberId => ({
          memberId, points: value.points, description: value.description,
          transactionType: "ADMIN_ADJUSTMENT" as const,
          awardedByUserId: session.userId, businessDate,
          referenceKey: `admin-award:${session.userId}:${value.batchId}:${memberId}`,
        })),
        skipDuplicates: true,
      });
    });
    return Response.json({ success: true, data: { awardedCount: result.count, selectedCount: memberIds.length, points: value.points } });
  } catch (error) { return apiError(error instanceof z.ZodError ? new AppError("INVALID_INPUT", "Select 1 to 200 members, enter 1 to 10,000 whole points, and provide a reason of 3 to 200 characters.") : error); }
}
