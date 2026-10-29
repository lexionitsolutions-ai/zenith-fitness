"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { refreshCurrentRoute } from "@/lib/route-refresh";
import { recoverStaleApp } from "@/lib/app-recovery";
export function AppResumeRecovery() {
  const router=useRouter();
  useEffect(()=>{
    const resume=()=>refreshCurrentRoute(()=>router.refresh());
    const restored=(event:PageTransitionEvent)=>{if(event.persisted)resume();};
    const failure=(event:ErrorEvent)=>{recoverStaleApp(event.error??event.message);};
    const rejected=(event:PromiseRejectionEvent)=>{recoverStaleApp(event.reason);};
    window.addEventListener("pageshow",restored);window.addEventListener("online",resume);
    window.addEventListener("error",failure);window.addEventListener("unhandledrejection",rejected);
    return ()=>{window.removeEventListener("pageshow",restored);window.removeEventListener("online",resume);window.removeEventListener("error",failure);window.removeEventListener("unhandledrejection",rejected);};
  },[router]);
  return null;
}
