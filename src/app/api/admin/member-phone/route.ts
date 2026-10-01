import { z } from "zod";
import { prisma } from "@/lib/database/prisma";
import { requireActiveRole } from "@/lib/auth/authorize";
import { AppError, apiError } from "@/lib/errors";
import { normalizeAdmissionId, normalizeIndianMobile } from "@/lib/utils/normalization";

const updateMemberPhone = z.object({
  admissionId: z.string().trim().min(1).max(30),
  mobile: z.string().trim().min(10).max(20),
});

export async function PATCH(request: Request) {
  try {
    await requireActiveRole(["ADMIN"]);
    const value = updateMemberPhone.parse(await request.json());
    const normalizedAdmissionId = normalizeAdmissionId(value.admissionId);
    const admissionId = normalizedAdmissionId?.replace(/^ZF-?(\d+)$/, "ZF-$1");
    if (!admissionId) throw new AppError("ADMISSION_ID_REQUIRED", "Enter a valid admission ID.", 400);

    const mobileNumber = normalizeIndianMobile(value.mobile);
    if (!mobileNumber) throw new AppError("INVALID_MOBILE", "Enter a valid Indian mobile number.", 400);

    const member = await prisma.member.findUnique({
      where: { admissionId },
      select: { id: true, admissionId: true, fullName: true, user: { select: { id: true } } },
    });
    if (!member) throw new AppError("MEMBER_NOT_FOUND", "Member not found.", 404);

    const existing = await prisma.user.findUnique({
      where: { mobileNumber },
      select: { id: true, memberId: true, role: true },
    });
    if (existing && existing.memberId !== member.id) {
      throw new AppError("MOBILE_IN_USE", "This mobile number already has another account.", 409);
    }

    const updated = await prisma.$transaction(async (transaction) => {
      const memberRecord = await transaction.member.update({
        where: { id: member.id },
        data: { mobileNumber, originalMobileNumber: value.mobile },
        select: { admissionId: true, fullName: true, mobileNumber: true },
      });

      if (member.user) {
        await transaction.user.update({
          where: { id: member.user.id },
          data: { mobileNumber, failedLoginCount: 0, lockedUntil: null, isActive: true },
        });
      }

      return memberRecord;
    });

    return Response.json({ success: true, data: updated });
  } catch (error) {
    return apiError(error);
  }
}
