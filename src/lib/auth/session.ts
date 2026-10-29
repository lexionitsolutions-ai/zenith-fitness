import {SignJWT,jwtVerify} from "jose";import {cookies} from "next/headers";import type {Role} from "@prisma/client";
import { prisma } from "@/lib/database/prisma";
import { resolveSessionAlias } from "./session-alias";
import { cache } from "react";
import { sessionAccountQuery, type SessionAccount } from "./session-account";
const key=()=>new TextEncoder().encode(process.env.SESSION_SECRET||"development-only-secret-change-me");export type Session={userId:string;memberId:string|null;role:Role;onboardingRequired?:boolean};
export const SESSION_MAX_AGE_SECONDS=60*60*24*365;
export async function createSession(s:Session){const token=await new SignJWT(s).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("365d").sign(key());(await cookies()).set("zenith_session",token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:SESSION_MAX_AGE_SECONDS})}
// React cache only deduplicates within a server render; account access is still
// checked against the database on every request, never cached across users.
export const getSession = cache(async (): Promise<Session | null> => {
  let session: Session;
  try {
    const token = (await cookies()).get("zenith_session")?.value;
    if (!token) return null;
    session = (await jwtVerify(token, key())).payload as unknown as Session;
  } catch { return null; }

  // Resolve the alias and read the current account in one round trip. Query
  // parameters stay bound by Prisma; account access is checked on every request.
  const [account] = await prisma.$queryRaw<SessionAccount[]>(sessionAccountQuery(session.userId));
  if (!account?.id || !account.role || !account.isActive) return null;
  const user = { id: account.id, memberId: account.memberId, role: account.role, isActive: account.isActive };
  const alias = account.previousUserId ? { previousMemberId: account.previousMemberId, user } : null;
  const resolved = resolveSessionAlias(session, alias);
  if (!resolved) return null;
  if (user.role !== resolved.role) return null;
  return { ...resolved, memberId: user.memberId };
});
export async function clearSession(){(await cookies()).delete("zenith_session")}
