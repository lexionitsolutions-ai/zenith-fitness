"use client";
import { useEffect } from "react";
import { AppLoadError } from "@/components/app/app-load-error";
import { recoverStaleApp } from "@/lib/app-recovery";
import { useRouter } from "next/navigation";
export default function ErrorPage({error,reset}:{error:Error&{digest?:string};reset:()=>void}) {
  const router=useRouter();
  useEffect(()=>{recoverStaleApp(error);},[error]);
  return <AppLoadError retry={()=>{router.refresh();reset();}} reference={error.digest}/>;
}
