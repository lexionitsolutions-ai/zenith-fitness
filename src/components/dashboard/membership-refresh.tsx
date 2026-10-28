"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export function MembershipRefresh() {
  const router = useRouter();
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      if (document.activeElement?.matches("input,textarea,select,[contenteditable=true]")) return;
      router.refresh();
    };
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.clearInterval(timer);window.removeEventListener("focus", refresh);document.removeEventListener("visibilitychange", refresh); };
  }, [router]);
  return null;
}
