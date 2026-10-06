import { beforeEach, describe, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ find: vi.fn(), claim: vi.fn(), update: vi.fn(), transaction: vi.fn(), memberUpdate: vi.fn(), membershipUpdate: vi.fn(), receipt: vi.fn(), post: vi.fn() }));
vi.mock("@/lib/database/prisma", () => ({ prisma: { sheetsSyncJob: { findUniqueOrThrow: m.find, updateMany: m.claim, update: m.update }, $transaction: m.transaction } }));
vi.mock("@/lib/sheets/reception", () => ({ findReceptionRow: m.receipt, postReception: m.post }));
import { syncSheetsJob } from "./sheets-sync.service";
beforeEach(() => {
  vi.resetAllMocks(); m.claim.mockResolvedValue({ count: 1 }); m.post.mockResolvedValue({ admissionId: "ZF-123" });
  m.find.mockResolvedValue({ id: "job", status: "PENDING", kind: "ADMISSION", updatedAt: new Date(), payload: { action: "admission", reference: "ZFtest", localMemberId: "member", localMembershipId: "cycle" } });
  m.receipt.mockResolvedValue(null);
  m.transaction.mockImplementation(fn => fn({ member: { update: m.memberUpdate }, membership: { update: m.membershipUpdate }, sheetsSyncJob: { update: m.update } }));
});
describe("Sheets sync delivery and recovery", () => {
  it("reconciles a previously written row without posting again", async () => {
    m.receipt.mockResolvedValue({ admissionId: "ZF-123", sourceSheet: "1 Month", sourceRow: 42 });
    expect(await syncSheetsJob("job")).toBe("SYNCED"); expect(m.post).not.toHaveBeenCalled();
    expect(m.memberUpdate).toHaveBeenCalledWith({ where: { id: "member" }, data: { admissionId: "ZF-123" } });
    expect(m.membershipUpdate).toHaveBeenCalledWith({ where: { id: "cycle" }, data: { sourceSheet: "1 Month", sourceRow: 42 } });
  });
  it("records an uncertain network write and never blindly repeats it", async () => {
    m.post.mockRejectedValue(new Error("timeout")); expect(await syncSheetsJob("job")).toBe("UNCERTAIN");
    m.find.mockResolvedValue({ id: "job", status: "UNCERTAIN", kind: "ADMISSION", updatedAt: new Date(), payload: {} }); m.post.mockClear();
    expect(await syncSheetsJob("job")).toBe("UNCERTAIN"); expect(m.post).not.toHaveBeenCalled();
  });
  it("does not resend a confirmed saved write when reconciliation is delayed", async () => {
    expect(await syncSheetsJob("job")).toBe("SAVED"); expect(m.post).toHaveBeenCalledOnce();
    m.find.mockResolvedValue({ id: "job", status: "SAVED", kind: "ADMISSION", updatedAt: new Date(), payload: {} }); m.post.mockClear();
    expect(await syncSheetsJob("job", true)).toBe("SAVED"); expect(m.post).not.toHaveBeenCalled();
  });
  it("requires an explicit missing-entry confirmation for uncertain enquiries", async () => {
    m.find.mockResolvedValue({ id: "job", status: "UNCERTAIN", kind: "ENQUIRY", updatedAt: new Date(), payload: { action: "enquire" } });
    expect(await syncSheetsJob("job")).toBe("UNCERTAIN"); expect(m.post).not.toHaveBeenCalled();
    expect(await syncSheetsJob("job", true)).toBe("SYNCED"); expect(m.post).toHaveBeenCalledOnce();
  });
  it("marks pre-write failures as safe to retry", async () => {
    m.receipt.mockRejectedValue(new Error("read failed")); expect(await syncSheetsJob("job")).toBe("FAILED"); expect(m.post).not.toHaveBeenCalled();
  });
  it("finishes a previously confirmed enquiry without sending it again", async () => {
    m.find.mockResolvedValue({ id: "job", status: "SAVED", kind: "ENQUIRY", updatedAt: new Date(), payload: { action: "enquire" } });
    expect(await syncSheetsJob("job")).toBe("SYNCED"); expect(m.post).not.toHaveBeenCalled();
  });
  it("does not send a job another worker has claimed", async () => {
    m.claim.mockResolvedValue({ count: 0 }); expect(await syncSheetsJob("job")).toBe("PROCESSING"); expect(m.post).not.toHaveBeenCalled();
  });
});
