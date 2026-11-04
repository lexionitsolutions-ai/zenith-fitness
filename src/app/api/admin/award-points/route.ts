import { z } from "zod";
import { requireActiveRole } from "@/lib/auth/authorize";
import { prisma } from "@/lib/database/prisma";
import { AppError, apiError } from "@/lib/errors";
import { DAILY_VISIT_POINTS, hasActiveMembership, indiaBusinessDate } from "@/lib/utils/point-rules";
import { normalizeAdmissionId } from "@/lib/utils/normalization";
import { authoritativeMemberships } from "@/lib/utils/management-memberships";

const awardInput = z.object({
  memberIds: z.array(z.string().uuid()).min(1).max(200),
}).strict();

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
    const now = new Date();
    const businessDate = indiaBusinessDate(now);
    const result = await prisma.$transaction(async (tx) => {
      const members = await tx.member.findMany({ where: { id: { in: memberIds } }, include: { memberships: true } });
      if (members.length !== memberIds.length) throw new AppError("MEMBER_NOT_FOUND", "One or more selected members no longer exist. Refresh and select them again.", 404);
      const ineligible = members.filter(member => !member.qrCodeActive || !hasActiveMembership(authoritativeMemberships(member), now));
      if (ineligible.length) throw new AppError("MEMBERSHIP_INACTIVE", `Remove members without active attendance access: ${ineligible.map(member => member.admissionId).join(", ")}. No points were awarded.`, 409);
      // Share the staff scan's unique daily key: photo attendance, retries,
      // and QR check-ins can only award one daily visit per member in India.
      return tx.pointTransaction.createMany({
        data: memberIds.map(memberId => ({
          memberId, points: DAILY_VISIT_POINTS, description: "Daily attendance verified by admin from photo",
          transactionType: "DAILY_VISIT" as const,
          awardedByUserId: session.userId, businessDate,
          referenceKey: `daily:${memberId}:${businessDate.toISOString().slice(0, 10)}`,
        })),
        skipDuplicates: true,
      });
    });
    return Response.json({ success: true, data: { awardedCount: result.count, alreadyAwardedCount: memberIds.length - result.count, selectedCount: memberIds.length, points: DAILY_VISIT_POINTS } });
  } catch (error) { return apiError(error instanceof z.ZodError ? new AppError("INVALID_INPUT", "Select 1 to 200 members. Only the standard daily attendance points can be awarded.") : error); }
}
