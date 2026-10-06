import { describe, expect, it } from "vitest";
import { membershipPackages } from "./membership-packages";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Zenith published membership prices", () => {
  it("provides four distinct durations in each of the three categories", () => {
    expect(membershipPackages).toHaveLength(12);
    expect(new Set(membershipPackages.map(p => p.planCode)).size).toBe(12);
    for (const category of ["MALE", "FEMALE", "FEMALE_HAPPY_HOURS"]) {
      expect(membershipPackages.filter(p => p.category === category).map(p => p.durationDays)).toEqual([30, 90, 180, 365]);
    }
  });
  it("matches every supplied price, including the male annual price of 9991", () => {
    expect(membershipPackages.map(p => p.standardPrice)).toEqual([2000, 4699, 6499, 9991, 1499, 3999, 5699, 8999, 1000, 3000, 4500, 6000]);
  });
  it("keeps the deploy migration aligned with the seeded catalog", () => {
    const sql = readFileSync(resolve("prisma/migrations/20261006130000_membership_package_prices/migration.sql"), "utf8");
    for (const p of membershipPackages) expect(sql).toContain(`('${p.planCode}', '${p.planName}', ${p.durationDays}, '${p.category}', ${p.standardPrice})`);
  });
});
