"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
export type MembershipOverview = Awaited<ReturnType<typeof import("@/services/membership-purchase.service").purchaseOverview>>;

export function useMembershipOverview(initial: MembershipOverview) {
  const router = useRouter();
  const [data, setData] = useState(initial);
  const inFlight = useRef<Promise<MembershipOverview>|null>(null);
  const lastRefresh = useRef(Date.now());
  const refresh = useCallback(async () => {
    if (inFlight.current) return inFlight.current;
    const pending = (async () => {
    const response = await fetch("/api/member/membership", { cache:"no-store" });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error?.message ?? "Unable to refresh membership details.");
    const next = body.data as MembershipOverview;
    setData(next);
    lastRefresh.current=Date.now();
    if (next.isMember !== initial.isMember) router.refresh();
    return next;
    })().finally(()=>{inFlight.current=null;});
    inFlight.current=pending;
    return pending;
  }, [initial.isMember, router]);
  useEffect(() => {
    const update = () => { if (document.visibilityState === "visible" && Date.now()-lastRefresh.current>=15000) void refresh().catch(() => {}); };
    const timer = window.setInterval(update, 30000);
    window.addEventListener("focus",update); document.addEventListener("visibilitychange",update);
    return () => { clearInterval(timer); window.removeEventListener("focus",update); document.removeEventListener("visibilitychange",update); };
  }, [refresh]);
  return { data, refresh };
}
