import { Prisma } from "@prisma/client";
import type { Role } from "@prisma/client";
import { appDatabaseObject } from "@/lib/database/app-object";

export type SessionAccount = {
  previousUserId: string | null;
  previousMemberId: string | null;
  id: string | null;
  memberId: string | null;
  role: Role | null;
  isActive: boolean | null;
};

export function sessionAccountQuery(userId: string) {
  return Prisma.sql`
    SELECT a."previousUserId", a."previousMemberId",
      u.id, u."memberId", u.role, u."isActive"
    FROM (SELECT ${userId}::uuid AS id) AS s
    LEFT JOIN ${appDatabaseObject("AppSessionAlias")} AS a ON a."previousUserId" = s.id
    LEFT JOIN ${appDatabaseObject("User")} AS u ON u.id = COALESCE(a."userId", s.id)
  `;
}
