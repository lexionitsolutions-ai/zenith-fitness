import { describe, expect, it } from "vitest";
import { appDatabaseObject } from "./app-object";

describe("pooled raw SQL schema qualification", () => {
  it("addresses app tables and functions in the configured schema", () => {
    const url = "postgresql://example/db?schema=zenith_app&pgbouncer=true";
    expect(appDatabaseObject("AppSessionAlias", url).sql).toBe('"zenith_app"."AppSessionAlias"');
    expect(appDatabaseObject("User", url).sql).toBe('"zenith_app"."User"');
    expect(appDatabaseObject("approve_app_membership", url).sql).toBe('"zenith_app"."approve_app_membership"');
  });
  it("uses public for a database URL without an explicit schema", () => {
    expect(appDatabaseObject("Member", "postgresql://example/db").sql).toBe('"public"."Member"');
  });
  it("quotes the complete schema identifier without allowing SQL injection", () => {
    const url = new URL("postgresql://example/db");
    url.searchParams.set("schema", 'app"; DROP TABLE "User"; --');
    expect(appDatabaseObject("User", url.toString()).sql).toBe('"app""; DROP TABLE ""User""; --"."User"');
  });
});
