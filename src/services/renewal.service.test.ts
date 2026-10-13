import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ query: vi.fn(), order: vi.fn(), update: vi.fn(), member: vi.fn(), latest: vi.fn(), create: vi.fn(), job: vi.fn(), plan: vi.fn(), sync: vi.fn(), transaction: vi.fn() }));
vi.mock("@/lib/database/prisma", () => ({ prisma: { $transaction: m.transaction } }));
vi.mock("./renewal-sheets.service", () => ({ syncRenewalSheetsJob: m.sync }));
import { reviewRenewal, submitRenewal } from "./renewal.service";
beforeEach(() => {
  vi.resetAllMocks();
  m.transaction.mockImplementation(fn => fn({ $queryRaw: m.query, renewalRequest: { findUnique: m.order, update: m.update }, member: { findUniqueOrThrow: m.member }, membership: { findFirst: m.latest, create: m.create }, membershipPlan: { upsert: m.plan }, renewalSheetsJob: { create: m.job } }));
  m.order.mockResolvedValue({ id: "order", memberId: "member", status: "SUBMITTED", utr: "123456789012", reference: "ZF-TEST", planCode: "MALE_30_DAYS", planName: "Male - 1 Month", durationDays: 30, category: "MALE", amount: { toFixed: () => "2000.00" } });
  m.member.mockResolvedValue({ id: "member", admissionId: "ZF-123", fullName: "Member", mobileNumber: "+919876543210", gender: "Male" });
  m.latest.mockResolvedValue({ endDate: new Date("2099-10-31") });
  m.plan.mockResolvedValue({ id: "plan" }); m.create.mockResolvedValue({ id: "membership" }); m.job.mockResolvedValue({ id: "job" }); m.sync.mockResolvedValue("SYNCED");
});
describe("renewal approval and ownership", () => {
  it("atomically renews an existing member and queues the matching Sheets payload", async () => {
    expect(await reviewRenewal("order", true, "admin")).toBe("SYNCED");
    expect(m.create.mock.calls[0][0].data).toMatchObject({ memberId: "member", planId: "plan", amountPaid: expect.anything(), paymentStatus: "PAID", paymentMode: "UPI", membershipStatus: "UPCOMING", startDate: new Date("2099-11-01") });
    expect(m.job.mock.calls[0][0].data.payload).toMatchObject({ action: "saveRenewal", admissionId: "ZF-123", plan: "30", startDate: "2099-11-01", endDate: "2099-12-01", finalAmount: "2000.00", amountPaid: "2000.00", pendingAmount: "0", mobile: "9876543210" });
    expect(m.update.mock.calls[0][0].data).toMatchObject({ status: "APPROVED", reviewedById: "admin", membershipId: "membership" });
    expect(m.sync).toHaveBeenCalledWith("job");
  });
  it("never activates a draft or an already approved request", async () => {
    for (const status of ["DRAFT", "APPROVED", "REJECTED"]) {
      m.order.mockResolvedValue({ status });
      await expect(reviewRenewal("order", true, "admin")).rejects.toMatchObject({ code: "ALREADY_REVIEWED" });
    }
    expect(m.create).not.toHaveBeenCalled(); expect(m.job).not.toHaveBeenCalled();
  });
  it("rejects without creating a membership or sending anything to Sheets", async () => {
    await reviewRenewal("order", false, "admin", "Reference does not match bank receipt");
    expect(m.update.mock.calls[0][0].data.status).toBe("REJECTED");
    expect(m.create).not.toHaveBeenCalled(); expect(m.sync).not.toHaveBeenCalled();
  });
  it("keeps approval durable when delivery fails", async () => {
    m.sync.mockRejectedValue(new Error("offline"));
    expect(await reviewRenewal("order", true, "admin")).toBe("PENDING");
    expect(m.job).toHaveBeenCalledOnce();
  });
  it("does not allow a member to submit another member's payment", async () => {
    await expect(submitRenewal("other-member", "order", "123456789012")).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(m.update).not.toHaveBeenCalled();
  });
  it("accepts repeat submission of the same reference without creating a second request", async () => {
    await submitRenewal("member", "order", "123456789012");
    expect(m.update).not.toHaveBeenCalled();
  });
});
