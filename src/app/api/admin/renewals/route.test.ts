import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ auth: vi.fn(), review: vi.fn(), sync: vi.fn() }));
vi.mock("@/lib/auth/authorize", () => ({ requireActiveRole: m.auth }));
vi.mock("@/services/renewal.service", () => ({ reviewRenewal: m.review }));
vi.mock("@/services/renewal-sheets.service", () => ({ syncRenewalSheetsJob: m.sync }));
import { POST } from "./route";
import { AppError } from "@/lib/errors";
const id = "12345678-1234-4234-8234-123456789012";
const request = (data: unknown) => new Request("http://localhost/api/admin/renewals", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
beforeEach(() => { vi.resetAllMocks(); m.auth.mockResolvedValue({ userId: "admin" }); });
describe("admin renewal authorization", () => {
  it("blocks a non-admin before any approval or Sheets write", async () => {
    m.auth.mockRejectedValue(new AppError("FORBIDDEN", "Admin only", 403));
    expect((await POST(request({ id, action: "approve", paymentVerified: true }))).status).toBe(403);
    expect(m.review).not.toHaveBeenCalled(); expect(m.sync).not.toHaveBeenCalled();
  });
  it("requires explicit bank verification before approval", async () => {
    for (const data of [{ id, action: "approve" }, { id, action: "approve", paymentVerified: false }]) {
      expect((await POST(request(data))).status).toBe(400);
    }
    expect(m.review).not.toHaveBeenCalled();
    m.review.mockResolvedValue("SYNCED");
    expect((await POST(request({ id, action: "approve", paymentVerified: true }))).status).toBe(200);
    expect(m.review).toHaveBeenCalledWith(id, true, "admin", undefined);
  });
  it("rejects unreviewable IDs and hidden client amount overrides", async () => {
    expect((await POST(request({ id: "invalid", action: "approve", paymentVerified: true }))).status).toBe(400);
    expect((await POST(request({ id, action: "approve", paymentVerified: true, amount: 1 }))).status).toBe(400);
    expect(m.review).not.toHaveBeenCalled();
  });
});
