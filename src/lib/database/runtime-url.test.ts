import { describe, expect, it } from "vitest";
import { runtimeDatabaseUrl } from "./runtime-url";
describe("serverless pool sizing",()=>{
  const raw="postgresql://runtime:example@pooler.example:6543/postgres?schema=zenith_app&pgbouncer=true&connection_limit=1&sslmode=require";
  it("allows bounded concurrency through the existing transaction pooler",()=>{
    const url=new URL(runtimeDatabaseUrl(raw,true)!);
    expect(url.searchParams.get("connection_limit")).toBe("3");
    expect(url.searchParams.get("pgbouncer")).toBe("true");
    expect(url.searchParams.get("schema")).toBe("zenith_app");
    expect(url.searchParams.get("sslmode")).toBe("require");
  });
  it("supports an explicit small operational override",()=>{
    expect(new URL(runtimeDatabaseUrl(raw,true,"1")!).searchParams.get("connection_limit")).toBe("1");
    expect(new URL(runtimeDatabaseUrl(raw,true,"99")!).searchParams.get("connection_limit")).toBe("3");
  });
  it("leaves development connections unchanged and conserves direct connections",()=>{
    expect(runtimeDatabaseUrl(raw,false)).toBe(raw);
    expect(new URL(runtimeDatabaseUrl("postgresql://example/db",true)!).searchParams.get("connection_limit")).toBe("1");
  });
});
