import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ transaction: vi.fn(), order: vi.fn(), visitor: vi.fn(), existing: vi.fn(), memberCreate: vi.fn(), memberFind: vi.fn(), userCreate: vi.fn(), membershipCreate: vi.fn(), visitorUpdate: vi.fn(), orderUpdate: vi.fn(), jobCreate: vi.fn(), sync: vi.fn() }));
vi.mock("@/lib/database/prisma", () => ({ prisma: { $transaction: m.transaction } }));
vi.mock("./sheets-sync.service", () => ({ syncSheetsJob: m.sync }));
import { reviewMembership } from "./membership-approval.service";
beforeEach(() => {
  vi.resetAllMocks();
  m.order.mockResolvedValue({ id: "order", status: "SUBMITTED", kind: "ADMISSION", visitorId: "visitor", category: "MALE", plan: { category: "MALE" }, startDate: new Date("2020-01-01"), durationDays: 30, amount: { toFixed: () => "2000.00" }, reference: "ZFtest", utr: "123456789012" });
  m.visitor.mockResolvedValue({ id: "visitor", memberId: null, fullName: "Test", mobileNumber: "+919876543210", passwordHash: "hashed" });
  m.existing.mockResolvedValue(null);
  m.memberCreate.mockResolvedValue({ id: "member", admissionId: "ONLINE-ZFtest", fullName: "Test", mobileNumber: "+919876543210", gender: "Male" });
  m.memberFind.mockResolvedValue({ id: "existing-member", admissionId: "ZF-123", fullName: "Existing", mobileNumber: "+919876543210", gender: "Male" });
  m.membershipCreate.mockResolvedValue({ id: "cycle" }); m.jobCreate.mockResolvedValue({ id: "job" }); m.sync.mockResolvedValue("SYNCED");
  m.transaction.mockImplementation(fn => fn({ $queryRaw: vi.fn(), membershipOrder: { findUnique: m.order, update: m.orderUpdate }, visitor: { findUniqueOrThrow: m.visitor, update: m.visitorUpdate }, user: { findUnique: m.existing, create: m.userCreate }, member: { findFirst: m.existing, findUniqueOrThrow: m.memberFind, create: m.memberCreate }, membership: { create: m.membershipCreate }, sheetsSyncJob: { create: m.jobCreate } }));
});
describe("membership approval transaction", () => {
  it("requires a submitted payment and prevents double approval", async () => {
    m.order.mockResolvedValue({ status: "PENDING" }); await expect(reviewMembership("order", true, "admin")).rejects.toThrow("transaction reference");
    m.order.mockResolvedValue({ status: "APPROVED" }); await expect(reviewMembership("order", true, "admin")).rejects.toThrow("already closed");
    expect(m.memberCreate).not.toHaveBeenCalled();
  });
  it("preserves selected start and uses reception expiry, queues only approved entries", async () => {
    expect(await reviewMembership("order", true, "admin")).toBe("SYNCED");
    const data = m.membershipCreate.mock.calls[0][0].data;
    expect(data.startDate.toISOString().slice(0, 10)).toBe("2020-01-01"); expect(data.endDate.toISOString().slice(0, 10)).toBe("2020-01-31"); expect(data.membershipStatus).toBe("EXPIRED");
    expect(m.jobCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ kind: "ADMISSION", payload: expect.objectContaining({ action: "admission", paymentStatus: "Paid", category: "Regular", finalAmount: "2000.00", remarks: expect.stringContaining("ZenithApp:ZFtest") }) }) });
    expect(m.sync).toHaveBeenCalledWith("job");
  });
  it("renews an existing member without creating another member or login", async () => {
    const order = await m.order(); m.order.mockResolvedValue({ ...order, kind: "RENEWAL", visitorId: null, memberId: "existing-member" });
    await reviewMembership("order", true, "admin");
    expect(m.memberCreate).not.toHaveBeenCalled(); expect(m.userCreate).not.toHaveBeenCalled();
    expect(m.jobCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ kind: "RENEWAL", payload: expect.objectContaining({ action: "saveRenewal", admissionId: "ZF-123" }) }) });
  });
  it("does not send rejected orders to Sheets", async () => {
    expect(await reviewMembership("order", false, "admin")).toBeNull(); expect(m.sync).not.toHaveBeenCalled(); expect(m.jobCreate).not.toHaveBeenCalled();
  });
});
