import type { Role } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";

export async function requireActiveRole(roles: Role[]) {
  const session = await getSession();
  if (!session || !roles.includes(session.role)) {
    throw new AppError("FORBIDDEN", "You do not have permission to perform this action.", 403);
  }
  // getSession already resolves aliases and verifies the current active user
  // and role against the database; avoid querying the same user twice.
  return session;
}
