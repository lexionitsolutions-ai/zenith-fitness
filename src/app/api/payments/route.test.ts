import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors";
import { indiaToday } from "@/lib/visitor";
const mocks = vi.hoisted(() => ({ owner: vi.fn(), currentOwner: vi.fn(), transaction: vi.fn(), lock: vi.fn(), plan: vi.fn(), pending: vi.fn(), create: vi.fn(), update: vi.fn() }));
vi.mock("@/lib/auth/payment-owner", () => ({ paymentOwner: mocks.owner, currentPaymentOwner: mocks.currentOwner }));
vi.mock("@/lib/database/prisma", () => ({ prisma: { $transaction: mocks.transaction, membershipOrder: { updateMany: mocks.update } } }));
import { POST, PATCH } from "./route";
const planId = "11111111-1111-4111-8111-111111111111", orderId = "22222222-2222-4222-8222-222222222222";
const req = (body: unknown) => new Request("http://localhost/api/payments", { method: "POST", body: JSON.stringify(body) });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.owner.mockResolvedValue({ visitorId: "visitor-1", memberId: null });
  mocks.currentOwner.mockResolvedValue({ visitorId: "visitor-1", memberId: null });
  mocks.lock.mockResolvedValue([{ memberId: null }]);
  mocks.plan.mockResolvedValue({ id: planId, planName: "1 Month", category: "MALE", durationDays: 30, isActive: true, standardPrice: { toNumber: () => 2500, toFixed: () => "2500.00" } });
  mocks.pending.mockResolvedValue(null);
  mocks.create.mockImplementation(async ({ data }) => ({ id: orderId, status: "PENDING", ...data }));
  mocks.transaction.mockImplementation(fn => fn({ $queryRaw: mocks.lock, membershipPlan: { findUnique: mocks.plan }, membershipOrder: { findFirst: mocks.pending, create: mocks.create } }));
});
describe("UPI orders and renewal dates", () => {
  it("requires an authenticated owner", async () => {
    mocks.owner.mockRejectedValue(new AppError("SIGN_IN_REQUIRED", "Sign in", 401));
    expect((await POST(req({ planId }))).status).toBe(401);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("uses the server price and generates the expiry", async () => {
    const r = await POST(req({ planId, startDate: "2020-01-01" }));
    expect(r.status).toBe(200); const data = (await r.json()).data;
    expect(data.amount).toBe("2500.00"); expect(data.endDate).toBe("2020-01-31");
    expect(new URL(data.upiUri).searchParams.get("pa")).toBe("zenithfitness360@okicici");
  });
  it("rejects client prices, member IDs and expiry dates", async () => {
    for (const extra of [{ amount: "1.00" }, { endDate: "2099-01-01" }, { memberId: "another-member" }]) expect((await POST(req({ planId, ...extra }))).status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it("rejects future and invalid start dates", async () => {
    for (const startDate of ["2099-01-01", "2020-02-30"]) expect((await POST(req({ planId, startDate }))).status).toBe(400);
  });
  it("links a renewal only to the session member", async () => {
    mocks.owner.mockResolvedValue({ memberId: "member-1", visitorId: null });
    expect((await POST(req({ planId, kind: "RENEWAL" }))).status).toBe(200);
    expect(mocks.owner).toHaveBeenCalledWith("RENEWAL");
    expect(mocks.create).toHaveBeenCalledWith({ data: expect.objectContaining({ memberId: "member-1", visitorId: null, kind: "RENEWAL", startDate: new Date(`${indiaToday()}T00:00:00Z`) }) });
  });
  it("refuses plans with no price", async () => {
    mocks.plan.mockResolvedValue({ isActive: true, standardPrice: null });
    expect((await POST(req({ planId }))).status).toBe(400);
  });
  it("reuses an open order with matching plan and date", async () => {
    mocks.pending.mockResolvedValue({ id: orderId, planId, startDate: new Date(`${indiaToday()}T00:00:00Z`), durationDays: 30, amount: { toFixed: () => "2500.00" }, reference: "ZFexisting" });
    expect((await POST(req({ planId }))).status).toBe(200); expect(mocks.create).not.toHaveBeenCalled();
  });
  it("submits only a pending order belonging to this member", async () => {
    mocks.currentOwner.mockResolvedValue({ memberId: "member-1", visitorId: null }); mocks.update.mockResolvedValue({ count: 1 });
    expect((await PATCH(req({ orderId, utr: "123456789012" }))).status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({ where: { id: orderId, memberId: "member-1", visitorId: null, status: "PENDING" }, data: { utr: "123456789012", status: "SUBMITTED" } });
  });
  it("rejects submitting an unowned or closed order", async () => {
    mocks.update.mockResolvedValue({ count: 0 }); expect((await PATCH(req({ orderId, utr: "123456789012" }))).status).toBe(409);
  });
});
