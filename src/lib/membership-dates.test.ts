import { describe, expect, it } from "vitest";
import { membershipEndDate, membershipStartInput } from "./membership-dates";
import { indiaToday } from "./visitor";
describe("membership date restrictions", () => {
  it("allows today and past dates, rejects future and invalid dates", () => {
    expect(membershipStartInput.safeParse(indiaToday()).success).toBe(true);
    expect(membershipStartInput.safeParse("2020-01-01").success).toBe(true);
    expect(membershipStartInput.safeParse("2099-01-01").success).toBe(false);
    expect(membershipStartInput.safeParse("2020-02-30").success).toBe(false);
  });
  it("matches reception expiry calculation across months and leap days", () => {
    expect(membershipEndDate("2024-02-01", 30)).toBe("2024-03-02");
    expect(membershipEndDate("2026-10-06", 90)).toBe("2027-01-04");
  });
});
