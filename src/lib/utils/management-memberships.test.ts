import { describe, it, expect } from "vitest";
import { authoritativeMemberships } from "./management-memberships";
describe("management source membership selection", () => {
  const old = { managementMembershipId: null, name: "old sheet period" };
  const canonical = { managementMembershipId: "canonical-id", name: "current Supabase period" };
  it("keeps independent app history for unlinked members", () => {
    expect(authoritativeMemberships({ memberships: [old] })).toEqual([old]);
  });
  it("uses only canonical periods after linking, preventing stale active dates", () => {
    expect(authoritativeMemberships({ managementMemberId: "source", memberships: [old, canonical] })).toEqual([canonical]);
  });
  it("does not grant activity through legacy rows when source has no periods", () => {
    expect(authoritativeMemberships({ managementMemberId: "source", memberships: [old] })).toEqual([]);
  });
});
