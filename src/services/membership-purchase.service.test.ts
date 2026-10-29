import { beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn() },
  membershipOrder: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
  pointTransaction: { aggregate: vi.fn(), create: vi.fn(), findUnique: vi.fn(), upsert: vi.fn() },
  $queryRaw: vi.fn(),
}));
const transaction = vi.hoisted(() => vi.fn());
vi.mock("@/lib/database/prisma", () => ({ prisma: { $transaction: transaction } }));
import { createMembershipOrder, reviewMembershipOrder, updateMembershipOrder } from "./membership-purchase.service";
const member = { id: "member", gender: "Female", address: "Kolhapur", birthDate: new Date("1995-01-01") };
const user = { id: "user", memberId: "member", role: "MEMBER", isActive: true, member };
const order = { id: "order", userId: "user", status: "AWAITING_PAYMENT", pointsUsed: 300, amountDue: 3699 };
beforeEach(() => {
  vi.resetAllMocks();
  transaction.mockImplementation(async (work: (tx: typeof db) => unknown) => work(db));
  db.user.findUnique.mockResolvedValue(user); db.user.findUniqueOrThrow.mockResolvedValue(user);
  db.membershipOrder.findFirst.mockResolvedValue(null);
  db.membershipOrder.create.mockImplementation(async ({ data }) => ({ id: "order", ...data }));
  db.membershipOrder.update.mockImplementation(async ({ data }) => ({ ...order, ...data }));
  db.pointTransaction.aggregate.mockResolvedValue({ _sum: { points: 1000 } });
});
describe("membership payments and points", () => {
  it("quotes the maximum regular renewal discount without deducting before payment", async () => {
    const created = await createMembershipOrder("user", "FEMALE_3");
    expect(created).toMatchObject({ pointsUsed: 300, amountDue: 3699, kind: "RENEWAL" });
    expect(db.pointTransaction.create).not.toHaveBeenCalled();
  });
  it("never discounts Happy Hours renewals", async () => {
    const created = await createMembershipOrder("user", "FEMALE_HAPPY_12");
    expect(created).toMatchObject({ pointsUsed: 0, amountDue: 6000 });
    expect(db.pointTransaction.create).not.toHaveBeenCalled();
  });
  it("does not give new admissions a points discount", async () => {
    db.user.findUnique.mockResolvedValue({ ...user, memberId: null, member: null, applicantProfile: member });
    expect(await createMembershipOrder("user", "FEMALE_3")).toMatchObject({ kind: "ADMISSION", pointsUsed: 0, amountDue: 3999 });
  });
  it("resumes an existing checkout instead of creating another", async () => {
    db.membershipOrder.findFirst.mockResolvedValue(order);
    expect(await createMembershipOrder("user", "FEMALE_12")).toBe(order);
    expect(db.membershipOrder.create).not.toHaveBeenCalled();
  });
  it("replaces an unpaid checkout and recalculates the regular renewal discount", async () => {
    db.membershipOrder.findFirst.mockResolvedValue({...order,planCode:"FEMALE_1"});
    expect(await createMembershipOrder("user","FEMALE_6",true)).toMatchObject({planCode:"FEMALE_6",pointsUsed:500,amountDue:5199});
    expect(db.membershipOrder.update).toHaveBeenCalledWith({where:{id:"order"},data:{status:"CANCELLED",reviewNote:expect.any(String)}});
    expect(db.pointTransaction.create).not.toHaveBeenCalled();
  });
  it("removes the discount when switching to Happy Hours", async () => {
    db.membershipOrder.findFirst.mockResolvedValue({...order,planCode:"FEMALE_3"});
    expect(await createMembershipOrder("user","FEMALE_HAPPY_3",true)).toMatchObject({pointsUsed:0,amountDue:3000});
  });
  it("does not replace a submitted payment or cancel an order for an invalid plan", async () => {
    db.membershipOrder.findFirst.mockResolvedValue({...order,planCode:"FEMALE_1",status:"PENDING_REVIEW"});
    await expect(createMembershipOrder("user","FEMALE_3",true)).rejects.toMatchObject({code:"PAYMENT_UNDER_REVIEW"});
    db.membershipOrder.findFirst.mockResolvedValue({...order,planCode:"FEMALE_1"});
    await expect(createMembershipOrder("user","MALE_3",true)).rejects.toMatchObject({code:"INVALID_PLAN"});
    expect(db.membershipOrder.update).not.toHaveBeenCalled();
    expect(db.membershipOrder.create).not.toHaveBeenCalled();
  });
  it("deducts points when the payment and UTR are submitted", async () => {
    db.membershipOrder.findFirst.mockResolvedValue(order);
    await updateMembershipOrder("user", "order", { action: "submit", utr: "123456789012", reportedAmount: 3699 });
    expect(db.pointTransaction.create).toHaveBeenCalledWith({ data: expect.objectContaining({ points: -300, memberId: "member", referenceKey: "membership-redemption:order" }) });
    expect(db.membershipOrder.update).toHaveBeenCalledWith({ where: { id:"order" }, data: expect.objectContaining({ status: "PENDING_REVIEW" }) });
  });
  it("accepts a UTR-only confirmation using the saved checkout total", async () => {
    db.membershipOrder.findFirst.mockResolvedValue(order);
    await updateMembershipOrder("user","order",{action:"submit",utr:"123456789012"});
    expect(db.membershipOrder.update).toHaveBeenCalledWith({where:{id:"order"},data:expect.objectContaining({reportedAmount:3699,status:"PENDING_REVIEW"})});
    expect(db.pointTransaction.create).toHaveBeenCalledOnce();
  });
  it("does not deduct again on a repeated payment submission", async () => {
    db.membershipOrder.findFirst.mockResolvedValue({ ...order, status:"PENDING_REVIEW", utr:"123456789012" });
    await updateMembershipOrder("user", "order", { action:"submit", utr:"123456789012", reportedAmount:3699 });
    expect(db.pointTransaction.create).not.toHaveBeenCalled();
    expect(db.membershipOrder.update).not.toHaveBeenCalled();
  });
  it("handles a lost submission response even if approval has already completed", async () => {
    db.membershipOrder.findFirst.mockResolvedValue({ ...order, status:"APPROVED", utr:"123456789012" });
    expect(await updateMembershipOrder("user", "order", { action:"submit", utr:"123456789012", reportedAmount:3699 })).toMatchObject({status:"APPROVED"});
    expect(db.pointTransaction.create).not.toHaveBeenCalled();
  });
  it("leaves the balance unchanged on unpaid cancellation", async () => {
    db.membershipOrder.findFirst.mockResolvedValue(order);
    db.pointTransaction.findUnique.mockResolvedValue(null);
    await updateMembershipOrder("user", "order", { action:"cancel" });
    expect(db.pointTransaction.create).not.toHaveBeenCalled();
    expect(db.pointTransaction.upsert).not.toHaveBeenCalled();
    expect(db.membershipOrder.update).toHaveBeenCalledWith({ where:{id:"order"}, data:{status:"CANCELLED"} });
  });
  it("keeps debited payments under review rather than allowing cancellation", async () => {
    db.membershipOrder.findFirst.mockResolvedValue({ ...order, status:"PENDING_REVIEW" });
    await expect(updateMembershipOrder("user", "order", {action:"cancel"})).rejects.toMatchObject({ code:"REVIEW_REQUIRED" });
  });
  it("rejects invalid references and insufficient points without recording payment", async () => {
    db.membershipOrder.findFirst.mockResolvedValue(order);
    await expect(updateMembershipOrder("user","order",{action:"submit",utr:"123",reportedAmount:3699})).rejects.toMatchObject({code:"INVALID_UTR"});
    db.pointTransaction.aggregate.mockResolvedValue({_sum:{points:20}});
    await expect(updateMembershipOrder("user","order",{action:"submit",utr:"123456789012",reportedAmount:3699})).rejects.toMatchObject({code:"POINTS_CHANGED"});
    expect(db.pointTransaction.create).not.toHaveBeenCalled();
  });
  it("rejects approving mismatched amounts", async () => {
    db.user.findUnique.mockResolvedValue({id:"admin",role:"ADMIN",isActive:true});
    db.membershipOrder.findUnique.mockResolvedValue({...order,status:"PENDING_REVIEW",reportedAmount:100});
    await expect(reviewMembershipOrder("admin","order","approve","")).rejects.toMatchObject({code:"AMOUNT_MISMATCH"});
  });
  it("returns deducted points once when an admin rejects a payment", async () => {
    db.user.findUnique.mockResolvedValueOnce({id:"admin",role:"ADMIN",isActive:true}).mockResolvedValue(user);
    db.membershipOrder.findUnique.mockResolvedValue({...order,status:"PENDING_REVIEW"});
    db.pointTransaction.findUnique.mockResolvedValue({points:-300});
    await reviewMembershipOrder("admin","order","reject","Payment not received; bank follow-up requested.");
    expect(db.pointTransaction.upsert).toHaveBeenCalledWith(expect.objectContaining({where:{referenceKey:"membership-release:order"},create:expect.objectContaining({points:300,transactionType:"REVERSAL"})}));
    expect(db.membershipOrder.update).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({status:"REJECTED"})}));
  });
  it("makes repeat approvals idempotent and blocks non-admin reviewers", async () => {
    db.user.findUnique.mockResolvedValue({id:"admin",role:"ADMIN",isActive:true});
    db.membershipOrder.findUnique.mockResolvedValue({...order,status:"APPROVED"});
    expect(await reviewMembershipOrder("admin","order","approve","")).toMatchObject({status:"APPROVED"});
    expect(db.membershipOrder.update).not.toHaveBeenCalled();
    db.user.findUnique.mockResolvedValue(user);
    await expect(reviewMembershipOrder("user","order","approve","")).rejects.toMatchObject({code:"FORBIDDEN"});
  });
});
