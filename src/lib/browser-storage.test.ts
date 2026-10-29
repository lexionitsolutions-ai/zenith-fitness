import { describe, expect, it } from "vitest";
import { safeStorage } from "./browser-storage";
describe("restricted browser storage",()=>{
  it("does not crash when a device blocks the storage getter",()=>{
    const storage=safeStorage(()=>{throw new Error("SecurityError");});
    expect(storage.getItem("key")).toBeNull();
    expect(storage.setItem("key","value")).toBe(false);
    expect(storage.removeItem("key")).toBe(false);
  });
  it("handles full storage without interrupting app startup",()=>{
    const storage=safeStorage(()=>({getItem:()=>"saved",setItem:()=>{throw new Error("QuotaExceededError");},removeItem:()=>{}}));
    expect(storage.getItem("key")).toBe("saved");
    expect(storage.setItem("key","value")).toBe(false);
  });
});
