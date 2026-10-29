import { afterEach, describe, expect, it, vi } from "vitest";
import { sessionAccountQuery } from "./session-account";

afterEach(() => vi.unstubAllEnvs());
describe("account lookup SQL", () => {
  it("qualifies both tables even when the pooled connection uses public", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://example/db?schema=zenith_app&pgbouncer=true");
    const query = sessionAccountQuery("private-user-id");
    expect(query.sql).toContain('LEFT JOIN "zenith_app"."AppSessionAlias"');
    expect(query.sql).toContain('LEFT JOIN "zenith_app"."User"');
    expect(query.sql).not.toContain("private-user-id");
    expect(query.values).toEqual(["private-user-id"]);
  });
});
