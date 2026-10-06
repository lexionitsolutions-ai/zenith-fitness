import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";
const mocks = vi.hoisted(() => ({ role: vi.fn(), review: vi.fn(), sync: vi.fn() }));
vi.mock("@/lib/auth/authorize", () => ({ requireActiveRole: mocks.role }));
vi.mock("@/lib/database/prisma", () => ({ prisma: {} }));
vi.mock("@/services/membership-approval.service", () => ({ reviewMembership: mocks.review }));
vi.mock("@/services/sheets-sync.service", () => ({ syncSheetsJob: mocks.sync }));
import { PATCH } from "./route";
const id = "11111111-1111-4111-8111-111111111111";
const req = (body: unknown) => new Request("http://localhost/api/admin/joining", { method: "PATCH", body: JSON.stringify(body) });
beforeEach(() => { vi.resetAllMocks(); mocks.role.mockResolvedValue({ userId: "admin-1" }); mocks.review.mockResolvedValue("SYNCED"); });
describe("admin approval API", () => {
  it("rejects non-admin approval", async () => {
    mocks.role.mockRejectedValue(new AppError("FORBIDDEN", "Forbidden", 403));
    expect((await PATCH(req({ action: "review", id, approve: true }))).status).toBe(403); expect(mocks.review).not.toHaveBeenCalled();
  });
  it("returns Sheets status after approval", async () => {
    const r = await PATCH(req({ action: "review", id, approve: true }));
    expect(mocks.review).toHaveBeenCalledWith(id, true, "admin-1"); expect((await r.json()).sheetsStatus).toBe("SYNCED");
  });
});
