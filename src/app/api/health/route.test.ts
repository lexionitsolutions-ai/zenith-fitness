import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { prisma } from "@/lib/database/prisma";

vi.mock("@/lib/database/prisma", () => ({ prisma: { $queryRaw: vi.fn() } }));
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("DATABASE_URL", "postgresql://runtime:test-password@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?schema=zenith_app");
});
afterEach(() => vi.unstubAllEnvs());
describe("health diagnostics", () => {
  it("reports timing and region without exposing connection details", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ gymId: "gym" }]);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "ok", database: "connected" });
    expect(response.headers.get("server-timing")).toMatch(/^db;dur=\d+\.\d$/);
    expect(response.headers.get("x-database-region")).toBe("ap-southeast-1");
    const headers = JSON.stringify([...response.headers]);
    expect(headers).not.toContain("test-password");
    expect(headers).not.toContain("pooler.supabase.com");
    expect(headers).not.toContain("postgresql:");
  });
  it("keeps database failures unavailable without exposing their details", async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error("private database error"));
    const response = await GET();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ status: "unavailable" });
  });
});
