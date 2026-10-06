import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/database/prisma";
import { createVisitorSession } from "@/lib/auth/visitor-session";
import { mobileInput, nameInput } from "@/lib/visitor";
import { apiError, AppError } from "@/lib/errors";

const input = z.object({ mode: z.enum(["signup", "login"]), name: nameInput.optional(), mobile: mobileInput, password: z.string().min(8).max(128) });
export async function POST(req: Request) {
  try {
    const parsed = input.safeParse(await req.json());
    if (!parsed.success) throw new AppError("INVALID_INPUT", parsed.error.issues[0].message);
    const v = parsed.data;
    let visitor = await prisma.visitor.findUnique({ where: { mobileNumber: v.mobile } });
    if (v.mode === "signup") {
      if (!v.name) throw new AppError("INVALID_INPUT", "Enter your name.");
      if (visitor || await prisma.user.findUnique({ where: { mobileNumber: v.mobile } }) || await prisma.member.findFirst({ where: { mobileNumber: v.mobile } })) throw new AppError("ACCOUNT_EXISTS", "This number already has a gym account. Please sign in or ask the front desk for login help.", 409);
      visitor = await prisma.visitor.create({ data: { fullName: v.name, mobileNumber: v.mobile, passwordHash: await bcrypt.hash(v.password, 12) } });
    } else {
      if (!visitor || visitor.lockedUntil && visitor.lockedUntil > new Date()) throw new AppError("INVALID_CREDENTIALS", "Invalid mobile number or password.", 401);
      if (!await bcrypt.compare(v.password, visitor.passwordHash)) {
        const failed = visitor.failedLoginCount + 1;
        await prisma.visitor.update({ where: { id: visitor.id }, data: { failedLoginCount: failed, lockedUntil: failed >= 5 ? new Date(Date.now() + 15 * 60000) : null } });
        throw new AppError("INVALID_CREDENTIALS", "Invalid mobile number or password.", 401);
      }
      await prisma.visitor.update({ where: { id: visitor.id }, data: { failedLoginCount: 0, lockedUntil: null } });
    }
    await createVisitorSession(visitor.id);
    return Response.json({ success: true });
  } catch (e) {
    if (e && typeof e === "object" && "code" in e && e.code === "P2002") return apiError(new AppError("ACCOUNT_EXISTS", "This number already has an account. Please sign in.", 409));
    return apiError(e);
  }
}
export async function DELETE() {
  (await cookies()).delete("zenith_visitor");
  return Response.json({ success: true });
}
