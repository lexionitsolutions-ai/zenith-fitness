import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/database/prisma";
import { requireActiveRole } from "@/lib/auth/authorize";
import { normalizeIndianMobile } from "@/lib/utils/normalization";
import { AppError, apiError } from "@/lib/errors";

const createStaff = z.object({
  name: z.string().trim().min(2).max(100),
  mobile: z.string().trim().min(10).max(20),
  password: z.string().min(8).max(128),
});

const staffSelect = {
  id: true,
  displayName: true,
  mobileNumber: true,
  isActive: true,
  createdAt: true,
  lastLoginAt: true,
} as const;

export async function GET() {
  try {
    await requireActiveRole(["ADMIN"]);
    const staff = await prisma.user.findMany({
      where: { role: "STAFF", isActive: true },
      select: staffSelect,
      orderBy: { displayName: "asc" },
    });
    return Response.json({ success: true, data: staff });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireActiveRole(["ADMIN"]);
    const value = createStaff.parse(await request.json());
    const mobileNumber = normalizeIndianMobile(value.mobile);
    if (!mobileNumber) throw new AppError("INVALID_MOBILE", "Enter a valid Indian mobile number.", 400);
    if (!/[A-Za-z]/.test(value.password) || !/\d/.test(value.password)) {
      throw new AppError("WEAK_PASSWORD", "Password must include at least one letter and one number.", 400);
    }

    const existing = await prisma.user.findUnique({ where: { mobileNumber } });
    if (existing && (existing.role !== "STAFF" || existing.isActive)) {
      throw new AppError("MOBILE_IN_USE", "This mobile number already has an account.", 409);
    }

    const pinHash = await bcrypt.hash(value.password, 12);
    const staff = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: {
            displayName: value.name,
            pinHash,
            isActive: true,
            failedLoginCount: 0,
            lockedUntil: null,
          },
          select: staffSelect,
        })
      : await prisma.user.create({
          data: {
            displayName: value.name,
            mobileNumber,
            pinHash,
            role: "STAFF",
            mobileVerified: true,
          },
          select: staffSelect,
        });

    return Response.json({ success: true, data: staff }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    await requireActiveRole(["ADMIN"]);
    const id = z.string().uuid().parse(new URL(request.url).searchParams.get("id"));
    const staff = await prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (!staff || staff.role !== "STAFF") {
      throw new AppError("STAFF_NOT_FOUND", "Staff member not found.", 404);
    }
    await prisma.user.update({
      where: { id },
      data: { isActive: false, failedLoginCount: 0, lockedUntil: null },
    });
    return Response.json({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
