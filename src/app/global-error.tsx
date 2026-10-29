"use client";
import { AppLoadError } from "@/components/app/app-load-error";
export default function GlobalError({error,reset}:{error:Error&{digest?:string};reset:()=>void}) {
  return <html lang="en"><body style={{margin:0}}><AppLoadError retry={reset} reference={error.digest}/></body></html>;
}
