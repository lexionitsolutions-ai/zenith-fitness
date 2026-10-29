import bcrypt from "bcryptjs";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/database/prisma";
import { createSession } from "@/lib/auth/session";
import { normalizeIndianMobile } from "@/lib/utils/normalization";
import { AppError, apiError } from "@/lib/errors";
const input = z.object({ name: z.string().trim().min(2).max(120), mobile: z.string().max(20), gender: z.enum(["Male", "Female"]), password: z.string().min(8).max(128).regex(/[A-Za-z]/).regex(/\d/), confirmPassword: z.string() }).refine(v => v.password === v.confirmPassword, { message: "Passwords must match." });
export async function POST(req: Request) {
  try {
    const value = input.parse(await req.json());
    const mobile = normalizeIndianMobile(value.mobile);
    if (!mobile) throw new AppError("INVALID_MOBILE", "Enter a valid Indian contact number.");
    const hash = await bcrypt.hash(value.password, 12);
    const user = await prisma.$transaction(async tx => {
      if (await tx.appLoginAlias.findUnique({ where: { mobileNumber: mobile } }) || await tx.member.findFirst({ where: { mobileNumber: mobile } })) throw new AppError("ACCOUNT_EXISTS", "This number is already registered. Sign in or contact the front desk for password help.", 409);
      return tx.user.create({ data: { displayName: value.name, mobileNumber: mobile, pinHash: hash, role: "MEMBER", applicantProfile: { create: { gender: value.gender } } } });
    });
    await createSession({ userId: user.id, memberId: null, role: "MEMBER", onboardingRequired: false });
    return Response.json({ success: true, data: { redirectTo: "/dashboard" } }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2021", "P2022"].includes(error.code)) return apiError(new AppError("REGISTRATION_UNAVAILABLE", "Account registration is temporarily unavailable. Please contact Zenith Fitness at 9272112745.", 503));
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return apiError(new AppError("ACCOUNT_EXISTS", "This number is already registered. Please sign in.", 409));
    if (error instanceof z.ZodError) return apiError(new AppError("INVALID_INPUT", error.issues[0]?.message ?? "Check your details."));
    return apiError(error);
  }
}
