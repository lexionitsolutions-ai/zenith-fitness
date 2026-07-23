import { describe, expect, it } from "vitest";
import { resolvePlan } from "./normalization";

describe("resolvePlan", () => {
  it("infers a standard plan when Sheets omits plan metadata", () => {
    expect(resolvePlan(undefined, "Google Sheets", new Date("2025-05-01"), new Date("2025-05-31"))).toMatchObject({ code: "PLAN_30_DAYS", days: 30 });
    expect(resolvePlan(undefined, "Google Sheets", new Date("2025-01-01"), new Date("2025-03-31"))).toMatchObject({ code: "PLAN_90_DAYS", days: 90 });
  });
});
