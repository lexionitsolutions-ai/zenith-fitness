import {SignJWT,jwtVerify} from "jose";import {cookies} from "next/headers";import type {Role} from "@prisma/client";
const key=()=>new TextEncoder().encode(process.env.SESSION_SECRET||"development-only-secret-change-me");export type Session={userId:string;memberId:string|null;role:Role;onboardingRequired?:boolean};
export async function createSession(s:Session){const token=await new SignJWT(s).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("7d").sign(key());(await cookies()).set("zenith_session",token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:604800})}
export async function getSession():Promise<Session|null>{try{const token=(await cookies()).get("zenith_session")?.value;if(!token)return null;return (await jwtVerify(token,key())).payload as unknown as Session}catch{return null}}
export async function clearSession(){(await cookies()).delete("zenith_session")}
