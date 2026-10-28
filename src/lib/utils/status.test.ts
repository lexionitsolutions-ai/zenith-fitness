import { describe, expect, it } from "vitest";
import { calculateMembershipStatus, daysBetween } from "./status";
describe("membership dates in the gym timezone", () => {
  const shortlyAfterMidnight = new Date("2026-10-28T18:35:00Z"); // 29 Oct, 00:05 IST
  it("activates a new period at midnight in India", () => {
    expect(calculateMembershipStatus(new Date("2026-10-29"),new Date("2026-11-28"),shortlyAfterMidnight)).toBe("ACTIVE");
  });
  it("expires yesterday's period and reports zero days on expiry day", () => {
    expect(calculateMembershipStatus(new Date("2026-09-28"),new Date("2026-10-28"),shortlyAfterMidnight)).toBe("EXPIRED");
    expect(daysBetween(shortlyAfterMidnight,new Date("2026-10-29"))).toBe(0);
  });
});
