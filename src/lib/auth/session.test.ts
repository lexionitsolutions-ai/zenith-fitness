import { beforeEach, describe, expect, it, vi } from "vitest";
import { getSession } from "./session";
import { prisma } from "@/lib/database/prisma";
import { jwtVerify } from "jose";

vi.mock("react", () => ({ cache: (fn: unknown) => fn }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => ({ value: "test-token" }) }) }));
vi.mock("jose", () => ({ jwtVerify: vi.fn(), SignJWT: vi.fn() }));
vi.mock("@/lib/database/prisma", () => ({ prisma: {
  appSessionAlias: { findUnique: vi.fn() }, user: { findUnique: vi.fn() },
} }));

const session = { userId: "old-user", memberId: "old-member", role: "MEMBER" };
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(jwtVerify).mockResolvedValue({ payload: session } as never);
  vi.mocked(prisma.appSessionAlias.findUnique).mockResolvedValue(null);
  vi.mocked(prisma.user.findUnique).mockResolvedValue({ memberId: "current-member", role: "MEMBER", isActive: true } as never);
});

describe("session account validation", () => {
  it("uses the current member identity", async () => {
    expect(await getSession()).toEqual({ ...session, memberId: "current-member" });
  });
  it.each([null, { memberId: "old-member", role: "MEMBER", isActive: false }, { memberId: "old-member", role: "STAFF", isActive: true }])("rejects missing, disabled or changed accounts", async (user) => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(user as never);
    expect(await getSession()).toBeNull();
  });
  it("uses the validated alias when the original user no longer exists", async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.appSessionAlias.findUnique).mockResolvedValue({ previousMemberId: "old-member", user: { id: "new-user", memberId: "new-member", role: "MEMBER", isActive: true } } as never);
    expect(await getSession()).toEqual({ userId: "new-user", memberId: "new-member", role: "MEMBER" });
    expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
  });
  it("rejects invalid tokens without querying accounts", async () => {
    vi.mocked(jwtVerify).mockRejectedValue(new Error("Invalid signature"));
    expect(await getSession()).toBeNull();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
