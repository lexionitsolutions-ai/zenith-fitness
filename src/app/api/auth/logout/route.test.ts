import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/auth/session", () => ({ clearSession: vi.fn() }));
import { clearSession } from "@/lib/auth/session";
import { GET, POST } from "./route";
beforeEach(() => vi.clearAllMocks());
describe("explicit logout", () => {
  it("does not clear cookies for a prefetched GET", async () => {
    const response = await GET(new Request("http://localhost/api/auth/logout?next=/login", { headers: { "next-router-prefetch": "1" } }));
    expect(clearSession).not.toHaveBeenCalled();
    expect(response.headers.get("set-cookie")).toBeNull();
  });
  it("logs out only after a POST", async () => {
    expect((await POST()).status).toBe(200);
    expect(clearSession).toHaveBeenCalledOnce();
  });
});
