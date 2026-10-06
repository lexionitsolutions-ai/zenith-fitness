import { describe, expect, it } from "vitest";
import { enquiryInput, indiaToday, upiPaymentUri, UPI_ID } from "./visitor";

describe("trial enquiries", () => {
  it("normalizes contact and accepts only real, current or future dates", () => {
    expect(enquiryInput.parse({ name: " Raj ", contact: "9876543210", trialDate: indiaToday() }).contact).toBe("+919876543210");
    expect(enquiryInput.safeParse({ name: "Raj", contact: "12345", trialDate: indiaToday() }).success).toBe(false);
    expect(enquiryInput.safeParse({ name: "Raj", contact: "9876543210", trialDate: "2020-01-01" }).success).toBe(false);
    expect(enquiryInput.safeParse({ name: "Raj", contact: "9876543210", trialDate: "2099-02-30" }).success).toBe(false);
  });
});
describe("UPI checkout", () => {
  it("includes the fixed recipient, exact amount, INR and order reference", () => {
    const uri = new URL(upiPaymentUri("2500.50", "ZFtest123"));
    expect(uri.protocol).toBe("upi:");
    expect(uri.searchParams.get("pa")).toBe(UPI_ID);
    expect(uri.searchParams.get("am")).toBe("2500.50");
    expect(uri.searchParams.get("cu")).toBe("INR");
    expect(uri.searchParams.get("tr")).toBe("ZFtest123");
  });
  it("rejects zero, negative and malformed amounts or references", () => {
    for (const amount of ["0.00", "-100.00", "NaN", "100&pa=other", "1"]) expect(() => upiPaymentUri(amount, "ZF123")).toThrow();
    expect(() => upiPaymentUri("100.00", "ZF123&pa=other")).toThrow();
  });
});
