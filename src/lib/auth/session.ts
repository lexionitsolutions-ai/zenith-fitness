import {SignJWT,jwtVerify} from "jose";import {cookies} from "next/headers";import type {Role} from "@prisma/client";
import { prisma } from "@/lib/database/prisma";
import { resolveSessionAlias } from "./session-alias";
const key=()=>new TextEncoder().encode(process.env.SESSION_SECRET||"development-only-secret-change-me");export type Session={userId:string;memberId:string|null;role:Role;onboardingRequired?:boolean};
export const SESSION_MAX_AGE_SECONDS=60*60*24*365;
export async function createSession(s:Session){const token=await new SignJWT(s).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("365d").sign(key());(await cookies()).set("zenith_session",token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:SESSION_MAX_AGE_SECONDS})}
export async function getSession():Promise<Session|null>{let session:Session;try{const token=(await cookies()).get("zenith_session")?.value;if(!token)return null;session=(await jwtVerify(token,key())).payload as unknown as Session}catch{return null}const alias=await prisma.appSessionAlias.findUnique({where:{previousUserId:session.userId},include:{user:{select:{id:true,memberId:true,role:true,isActive:true}}}});return resolveSessionAlias(session,alias)}
export async function clearSession(){(await cookies()).delete("zenith_session")}
