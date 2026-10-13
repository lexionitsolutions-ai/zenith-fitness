import { afterEach, describe, expect, it, vi } from "vitest";
import { findReceptionRow, postReception, sheetText } from "./reception";
afterEach(() => vi.unstubAllGlobals());
describe("reception Sheets protocol", () => {
  it("sends the existing form fields without app-only identifiers", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ success: true, admissionId: "ZF-123" })); vi.stubGlobal("fetch", fetcher);
    await postReception({ action: "saveRenewal", admissionId: "ZF-123", plan: "30", startDate: "2020-01-01", endDate: "2020-01-31", remarks: "ZenithApp:ZFtest", reference: "ZFtest", localMemberId: "local", localMembershipId: "cycle" }, "RENEWAL");
    const body = fetcher.mock.calls[0][1].body as URLSearchParams;
    expect(body.get("action")).toBe("saveRenewal"); expect(body.get("remarks")).toBe("ZenithApp:ZFtest"); expect(body.has("localMemberId")).toBe(false); expect(body.has("reference")).toBe(false);
  });
  it("finds the unique reference only if amount, member and target sheet match", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ success: true, members: [{ remarks: "ZenithApp:ZFtest; UPI", admissionId: "ZF-123", sourceSheet: "Renewals 1M", sourceRow: 12, mobile: "9876543210", finalAmount: 2000 }] })));
    expect(await findReceptionRow({ action: "saveRenewal", reference: "ZFtest", plan: "30", mobile: "9876543210", admissionId: "ZF-123", finalAmount: "2000.00" })).toEqual({ admissionId: "ZF-123", sourceSheet: "Renewals 1M", sourceRow: 12 });
  });
  it("escapes spreadsheet formulas in user-entered text", () => {
    expect(sheetText("=HYPERLINK(\"bad\")")).toBe("'=HYPERLINK(\"bad\")"); expect(sheetText("Raj")).toBe("Raj");
  });
});
