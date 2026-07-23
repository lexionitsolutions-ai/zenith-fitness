import type { Role } from "@prisma/client";
import { prisma } from "@/lib/database/prisma";
import { getSession } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";

export async function requireActiveRole(roles: Role[]) {
  const session = await getSession();
  if (!session || !roles.includes(session.role)) {
    throw new AppError("FORBIDDEN", "You do not have permission to perform this action.", 403);
  }
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { isActive: true, role: true },
  });
  if (!user?.isActive || user.role !== session.role) {
    throw new AppError("SESSION_REVOKED", "Your account access has been removed. Please sign in again.", 401);
  }
  return session;
}
