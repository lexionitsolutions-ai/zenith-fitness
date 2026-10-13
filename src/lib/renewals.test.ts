import { describe, expect, it } from "vitest";
import { renewalDates, submitRenewalInput, upiUri, UPI_ID, UPI_PAYEE } from "./renewals";
describe("member renewal rules", () => {
  it("preserves remaining membership days without overlapping an inclusive expiry", () => {
    expect(renewalDates("2026-10-13", "2026-10-31", 30)).toEqual({ start: "2026-11-01", end: "2026-12-01" });
    expect(renewalDates("2026-10-13", "2026-10-13", 30).start).toBe("2026-10-14");
  });
  it("restarts expired memberships on approval and handles leap years", () => {
    expect(renewalDates("2026-10-13", "2026-09-30", 30)).toEqual({ start: "2026-10-13", end: "2026-11-12" });
    expect(renewalDates("2028-02-01", null, 30).end).toBe("2028-03-02");
  });
  it("includes the supplied ICICI payee, exact amount and reference in the QR", () => {
    const uri = new URL(upiUri("4699.00", "ZF-ABC123"));
    expect(UPI_ID).toBe("9272112745.etb@icici");
    expect(uri.searchParams.get("pa")).toBe("9272112745.etb@icici");
    expect(UPI_PAYEE).toBe("RAJVARDHAN HEMANT PATIL HUF");
    expect(uri.searchParams.get("pn")).toBe("RAJVARDHAN HEMANT PATIL HUF");
    expect(uri.searchParams.get("am")).toBe("4699.00");
    expect(uri.searchParams.get("tr")).toBe("ZF-ABC123");
    expect(uri.searchParams.get("cu")).toBe("INR");
    expect(upiUri("4699.00", "ZF-ABC123")).not.toContain("+");
  });
  it("rejects malformed UTRs and client attempts to alter price or ownership", () => {
    const input = { id: "12345678-1234-4234-8234-123456789012", utr: "123456789012" };
    expect(submitRenewalInput.safeParse(input).success).toBe(true);
    for (const patch of [{ utr: "abc" }, { amount: 1 }, { memberId: "someone-else" }, { status: "APPROVED" }]) {
      expect(submitRenewalInput.safeParse({ ...input, ...patch }).success).toBe(false);
    }
  });
});
