import { requireActiveRole } from "./authorize";
import { prisma } from "@/lib/database/prisma";
import { AppError } from "@/lib/errors";
export async function requireRenewalMember() {
  const session = await requireActiveRole(["MEMBER"]);
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { memberId: true, mustChangePassword: true } });
  if (!user?.memberId || user.mustChangePassword) throw new AppError("MEMBER_REQUIRED", "Complete your member account setup before renewing.", 403);
  return user.memberId;
}
