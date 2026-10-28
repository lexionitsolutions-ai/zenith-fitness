// Original app history stays in place, but a linked member's eligibility and
// balance always come from the membership manager's canonical periods.
export function authoritativeMemberships<T extends { managementMembershipId?: string | null }>(
  member: { managementMemberId?: string | null; memberships: T[] }
): T[] {
  return member.managementMemberId
    ? member.memberships.filter(period => Boolean(period.managementMembershipId))
    : member.memberships;
}
