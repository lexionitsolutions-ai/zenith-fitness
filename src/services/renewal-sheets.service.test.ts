import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ find: vi.fn(), claim: vi.fn(), update: vi.fn(), transaction: vi.fn(), memberUpdate: vi.fn(), membershipUpdate: vi.fn(), membershipFind: vi.fn(), membershipDelete: vi.fn(), requestUpdate: vi.fn(), receipt: vi.fn(), post: vi.fn() }));
vi.mock("@/lib/database/prisma", () => ({ prisma: { renewalSheetsJob: { findUniqueOrThrow: m.find, updateMany: m.claim, update: m.update }, $transaction: m.transaction } }));
vi.mock("@/lib/sheets/reception", () => ({ findReceptionRow: m.receipt, postReception: m.post }));
import { syncRenewalSheetsJob } from "./renewal-sheets.service";
beforeEach(() => {
  vi.resetAllMocks(); m.claim.mockResolvedValue({ count: 1 }); m.post.mockResolvedValue({ admissionId: "ZF-123" });
  m.find.mockResolvedValue({ id: "job", status: "PENDING", kind: "RENEWAL", updatedAt: new Date(), payload: { action: "saveRenewal", reference: "ZFtest", localMemberId: "member", localMembershipId: "cycle" } });
  m.receipt.mockResolvedValue(null);
  m.transaction.mockImplementation(fn => fn({ member: { update: m.memberUpdate }, membership: { update: m.membershipUpdate, findUnique: m.membershipFind, delete: m.membershipDelete }, renewalRequest: { updateMany: m.requestUpdate }, renewalSheetsJob: { update: m.update } }));
});
describe("Sheets sync delivery and recovery", () => {
  it("reconciles a previously written row without posting again", async () => {
    m.receipt.mockResolvedValue({ admissionId: "ZF-123", sourceSheet: "Renewals 1M", sourceRow: 42 });
    expect(await syncRenewalSheetsJob("job")).toBe("SYNCED"); expect(m.post).not.toHaveBeenCalled();
    expect(m.memberUpdate).not.toHaveBeenCalled();
    expect(m.membershipUpdate).toHaveBeenCalledWith({ where: { id: "cycle" }, data: { sourceSheet: "Renewals 1M", sourceRow: 42 } });
  });
  it("records an uncertain network write and never blindly repeats it", async () => {
    m.post.mockRejectedValue(new Error("timeout")); expect(await syncRenewalSheetsJob("job")).toBe("UNCERTAIN");
    m.find.mockResolvedValue({ id: "job", status: "UNCERTAIN", kind: "RENEWAL", updatedAt: new Date(), payload: {} }); m.post.mockClear();
    expect(await syncRenewalSheetsJob("job")).toBe("UNCERTAIN"); expect(m.post).not.toHaveBeenCalled();
  });
  it("does not resend a confirmed saved write when reconciliation is delayed", async () => {
    expect(await syncRenewalSheetsJob("job")).toBe("SAVED"); expect(m.post).toHaveBeenCalledOnce();
    m.find.mockResolvedValue({ id: "job", status: "SAVED", kind: "RENEWAL", updatedAt: new Date(), payload: {} }); m.post.mockClear();
    expect(await syncRenewalSheetsJob("job", true)).toBe("SAVED"); expect(m.post).not.toHaveBeenCalled();
  });
  it("marks pre-write failures as safe to retry", async () => {
    m.receipt.mockRejectedValue(new Error("read failed")); expect(await syncRenewalSheetsJob("job")).toBe("FAILED"); expect(m.post).not.toHaveBeenCalled();
  });
  it("does not send a job another worker has claimed", async () => {
    m.claim.mockResolvedValue({ count: 0 }); expect(await syncRenewalSheetsJob("job")).toBe("PROCESSING"); expect(m.post).not.toHaveBeenCalled();
  });
  it("reconciles a row already imported without duplicating the member cycle", async () => {
    m.receipt.mockResolvedValue({ admissionId: "ZF-123", sourceSheet: "Renewals 1M", sourceRow: 42 });
    m.membershipFind.mockResolvedValue({ id: "imported-cycle", memberId: "member", remarks: "ZenithApp:ZFtest; UPI" });
    expect(await syncRenewalSheetsJob("job")).toBe("SYNCED");
    expect(m.requestUpdate).toHaveBeenCalledWith({ where: { membershipId: "cycle" }, data: { membershipId: "imported-cycle" } });
    expect(m.membershipDelete).toHaveBeenCalledWith({ where: { id: "cycle" } });
    expect(m.post).not.toHaveBeenCalled();
  });
  it("does not overwrite a conflicting imported member", async () => {
    m.receipt.mockResolvedValue({ admissionId: "ZF-123", sourceSheet: "Renewals 1M", sourceRow: 42 });
    m.membershipFind.mockResolvedValue({ id: "other-cycle", memberId: "other-member", remarks: "ZenithApp:ZFtest" });
    expect(await syncRenewalSheetsJob("job")).toBe("FAILED");
    expect(m.membershipDelete).not.toHaveBeenCalled();
    expect(m.post).not.toHaveBeenCalled();
  });
});
