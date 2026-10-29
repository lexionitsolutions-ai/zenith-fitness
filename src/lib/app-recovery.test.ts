import { afterEach, describe, expect, it, vi } from "vitest";
import { isChunkLoadFailure, recoverStaleApp } from "./app-recovery";
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
describe("outdated app assets",()=>{
  it("recognizes iOS, Android and webpack chunk failures",()=>{
    for (const message of ["ChunkLoadError: Loading chunk 12 failed","Importing a module script failed.","Failed to fetch dynamically imported module: /_next/static/old.js"]) expect(isChunkLoadFailure(new Error(message))).toBe(true);
  });
  it("does not reload for ordinary server or authentication errors",()=>{
    expect(isChunkLoadFailure(new Error("Connection pool timeout"))).toBe(false);
    expect(isChunkLoadFailure(new Error("Authentication required"))).toBe(false);
  });
  it("reloads a stale app only once within a minute",()=>{
    const values=new Map<string,string>(),reload=vi.fn();
    vi.stubGlobal("window",{location:{reload},sessionStorage:{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value)}});
    vi.stubGlobal("navigator",{onLine:true});
    vi.spyOn(Date,"now").mockReturnValue(1000000);
    expect(recoverStaleApp(new Error("ChunkLoadError"))).toBe(true);
    expect(recoverStaleApp(new Error("ChunkLoadError"))).toBe(false);
    expect(reload).toHaveBeenCalledOnce();
  });
  it("never creates a reload loop when device storage is blocked",()=>{
    const reload=vi.fn();
    vi.stubGlobal("window",{location:{reload},get sessionStorage(){throw new Error("SecurityError");}});
    vi.stubGlobal("navigator",{onLine:true});
    expect(recoverStaleApp(new Error("ChunkLoadError"))).toBe(false);
    expect(reload).not.toHaveBeenCalled();
  });
});
