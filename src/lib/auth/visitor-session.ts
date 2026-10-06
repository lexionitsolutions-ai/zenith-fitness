import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/database/prisma";
import { AppError } from "@/lib/errors";

const key = () => new TextEncoder().encode(process.env.SESSION_SECRET || "development-only-secret-change-me");
export async function createVisitorSession(id: string) {
  const token = await new SignJWT({ visitorId: id }).setProtectedHeader({ alg: "HS256" }).setAudience("zenith-visitor").setIssuedAt().setExpirationTime("30d").sign(key());
  (await cookies()).set("zenith_visitor", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 30 * 86400 });
}
export async function getVisitor() {
  const token = (await cookies()).get("zenith_visitor")?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { audience: "zenith-visitor" });
    if (typeof payload.visitorId !== "string") return null;
    return await prisma.visitor.findUnique({ where: { id: payload.visitorId } });
  } catch { return null; }
}
export async function requireVisitor() {
  const visitor = await getVisitor();
  if (!visitor) throw new AppError("SIGN_IN_REQUIRED", "Sign up or sign in before buying a membership.", 401);
  return visitor;
}
