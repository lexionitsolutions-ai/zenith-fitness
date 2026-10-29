import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { prisma } from "@/lib/database/prisma";
import { requireActiveRole } from "@/lib/auth/authorize";
import { AppError } from "@/lib/errors";

vi.mock("@/lib/auth/authorize", () => ({ requireActiveRole: vi.fn() }));
vi.mock("@/lib/database/prisma", () => ({ prisma: {
  member: { findFirst: vi.fn() }, pointTransaction: { aggregate: vi.fn() },
} }));
const request = (q: string) => new Request(`http://localhost/api/staff/member?q=${encodeURIComponent(q)}`);
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(requireActiveRole).mockResolvedValue({ userId: "staff", memberId: null, role: "STAFF" });
  vi.mocked(prisma.member.findFirst).mockResolvedValue({ id: "member", admissionId: "ZF-12", fullName: "Member", targets: [] } as never);
  vi.mocked(prisma.pointTransaction.aggregate).mockResolvedValue({ _sum: { points: 75 } } as never);
});
describe("staff member lookup", () => {
  it("matches the admission ID without an empty alternative that matches everyone", async () => {
    const response = await GET(request("12"));
    expect(response.status).toBe(200);
    expect(prisma.member.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { OR: [{ admissionId: "ZF-12" }] } }));
    expect((await response.json()).data.pointsBalance).toBe(75);
  });
  it("includes a phone suffix only for a complete phone number", async () => {
    await GET(request("+91 98765 43210"));
    expect(prisma.member.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { OR: expect.arrayContaining([{ mobileNumber: { endsWith: "9876543210" } }]) } }));
  });
  it("returns zero when the member has no points ledger", async () => {
    vi.mocked(prisma.pointTransaction.aggregate).mockResolvedValue({ _sum: { points: null } } as never);
    expect((await (await GET(request("ZF-12"))).json()).data.pointsBalance).toBe(0);
  });
  it("returns 404 rather than an unrelated member for an unknown admission", async () => {
    vi.mocked(prisma.member.findFirst).mockResolvedValue(null);
    expect((await GET(request("ZF-999999"))).status).toBe(404);
    expect(prisma.pointTransaction.aggregate).not.toHaveBeenCalled();
  });
  it("denies non-staff accounts before reading member data", async () => {
    vi.mocked(requireActiveRole).mockRejectedValue(new AppError("FORBIDDEN", "Forbidden", 403));
    expect((await GET(request("ZF-12"))).status).toBe(403);
    expect(prisma.member.findFirst).not.toHaveBeenCalled();
  });
});
