import { describe, expect, it, vi } from "vitest";
import { createRefreshGate } from "./route-refresh";
describe("mobile resume refresh",()=>{
  it("coalesces focus, visibility and streak refreshes on the same route",()=>{
    const gate=createRefreshGate(),refresh=vi.fn();
    gate("/dashboard",refresh,0);gate("/dashboard",refresh,10);gate("/dashboard",refresh,100);
    expect(refresh).toHaveBeenCalledOnce();
    gate("/dashboard",refresh,5001);expect(refresh).toHaveBeenCalledTimes(2);
  });
  it("does not suppress refreshes after switching routes",()=>{
    const gate=createRefreshGate(),refresh=vi.fn();
    gate("/dashboard",refresh,0);gate("/points",refresh,1);
    expect(refresh).toHaveBeenCalledTimes(2);
  });
});
