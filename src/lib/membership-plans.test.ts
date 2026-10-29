import { describe, expect, it } from "vitest";
import { MEMBERSHIP_PLANS, membershipPeriod, planForGender, renewalDiscount, upiPaymentUrl } from "./membership-plans";
describe("membership checkout rules", () => {
  it("uses the supplied prices for all twelve plans", () => {
    expect(MEMBERSHIP_PLANS.map(p => p.price)).toEqual([2000,4699,6499,9991,1499,3999,5699,8999,1000,3000,4500,6000]);
  });
  it("restricts female happy hours and male plans by profile gender", () => {
    expect(planForGender("FEMALE_HAPPY_1", "Male")).toBeNull();
    expect(planForGender("MALE_1", "Female")).toBeNull();
    expect(planForGender("FEMALE_HAPPY_1", "Female")?.price).toBe(1000);
  });
  it("redeems the maximum available points without exceeding the cap or price", () => {
    expect(renewalDiscount(40, 100, 2000)).toBe(40);
    expect(renewalDiscount(1000, 700, 8999)).toBe(700);
    expect(renewalDiscount(-10, 100, 2000)).toBe(0);
  });
  it("never discounts Happy Hours packages even with a large points balance", () => {
    for (const plan of MEMBERSHIP_PLANS.filter(p => p.category === "FEMALE_HAPPY")) {
      expect(plan.discountCap).toBe(0);
      expect(renewalDiscount(10000, plan.discountCap, plan.price)).toBe(0);
    }
  });
  it("extends after the latest membership and clamps month boundaries", () => {
    const result = membershipPeriod(1, new Date("2026-12-30Z"), new Date("2026-10-29Z"));
    expect(result.start.toISOString().slice(0,10)).toBe("2026-12-31");
    expect(result.end.toISOString().slice(0,10)).toBe("2027-01-30");
    expect(membershipPeriod(1, null, new Date("2026-01-31Z")).end.toISOString().slice(0,10)).toBe("2026-02-27");
  });
  it("encodes the exact amount, merchant and unique reference in the QR", () => {
    const url = new URL(upiPaymentUrl({id:"order-123", amountDue:4599}));
    expect(url.searchParams.get("pa")).toBe("9545405777@okbizaxis");
    expect(url.searchParams.get("am")).toBe("4599.00");
    expect(url.searchParams.get("tr")).toBe("order-123");
  });
});
