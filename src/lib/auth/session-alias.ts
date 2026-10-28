import type { Role } from "@prisma/client";
type Session = { userId: string; memberId: string | null; role: Role; onboardingRequired?: boolean };
type Alias = { previousMemberId: string | null; user: { id: string; memberId: string | null; role: Role; isActive: boolean } };
export function resolveSessionAlias(session: Session, alias: Alias | null): Session | null {
  if (!alias) return session;
  if (!alias.user.isActive || alias.user.role !== session.role || alias.previousMemberId !== session.memberId) return null;
  return { ...session, userId: alias.user.id, memberId: alias.user.memberId };
}
