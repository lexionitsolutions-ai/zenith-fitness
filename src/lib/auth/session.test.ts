import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSession } from "./session";
import { prisma } from "@/lib/database/prisma";
import { jwtVerify } from "jose";

vi.mock("react", () => ({ cache: (fn: unknown) => fn }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "test-token" }) }) }));
vi.mock("jose", () => ({ jwtVerify: vi.fn(), SignJWT: vi.fn() }));
vi.mock("@/lib/database/prisma", () => ({ prisma: {
  $queryRaw: vi.fn(),
} }));

const session = { userId: "old-user", memberId: "old-member", role: "MEMBER" };
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(jwtVerify).mockResolvedValue({ payload: session } as never);
  vi.mocked(prisma.$queryRaw).mockResolvedValue([{ previousUserId: null, previousMemberId: null, id: "old-user", memberId: "current-member", role: "MEMBER", isActive: true }]);
});

describe("session account validation", () => {
  it("uses the current member identity", async () => {
    expect(await getSession()).toEqual({ ...session, memberId: "current-member" });
  });
  it.each([null, { memberId: "old-member", role: "MEMBER", isActive: false }, { memberId: "old-member", role: "STAFF", isActive: true }])("rejects missing, disabled or changed accounts", async (user) => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue(user ? [{ id: "old-user", previousUserId: null, ...user }] : []);
    expect(await getSession()).toBeNull();
  });
  it("uses the validated alias when the original user no longer exists", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ previousUserId: "old-user", previousMemberId: "old-member", id: "new-user", memberId: "new-member", role: "MEMBER", isActive: true }]);
    expect(await getSession()).toEqual({ userId: "new-user", memberId: "new-member", role: "MEMBER" });
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });
  it("rejects an alias belonging to another member", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ previousUserId: "old-user", previousMemberId: "different-member", id: "new-user", memberId: "new-member", role: "MEMBER", isActive: true }]);
    expect(await getSession()).toBeNull();
  });
  it("rejects an alias whose current account was deleted", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ previousUserId: "old-user", previousMemberId: "old-member", id: null, memberId: null, role: null, isActive: null }]);
    expect(await getSession()).toBeNull();
  });
  it("rejects invalid tokens without querying accounts", async () => {
    vi.mocked(jwtVerify).mockRejectedValue(new Error("Invalid signature"));
    expect(await getSession()).toBeNull();
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });
});
