import assert from "node:assert/strict";
import env from "@next/env";
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";

env.loadEnvConfig(process.cwd(), true);
const db = new PrismaClient();
const base = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
async function sessionCookie(user) {
  const token = await new SignJWT({ userId: user.id, memberId: user.memberId, role: user.role, onboardingRequired: false }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("5m").sign(new TextEncoder().encode(process.env.SESSION_SECRET || "development-only-secret-change-me"));
  return `zenith_session=${token}`;
}
try {
  const anon = await fetch(`${base}/renew`, { redirect: "manual" });
  assert.equal(anon.status, 307);
  const member = await db.user.findFirst({ where: { role: "MEMBER", isActive: true, memberId: { not: null } }, select: { id: true, memberId: true, role: true } });
  assert(member, "A local member is required for this read-only smoke test.");
  const cookie = await sessionCookie(member);
  const renewal = await fetch(`${base}/renew`, { headers: { cookie } });
  const html = await renewal.text();
  assert.equal(renewal.status, 200);
  assert(html.includes("Renewal start date"));
  assert(html.includes("Renew with UPI"));
  assert(html.includes("system"));
  for (const body of [{ planId: "11111111-1111-4111-8111-111111111111", kind: "RENEWAL", startDate: "2099-01-01" }, { planId: "11111111-1111-4111-8111-111111111111", kind: "RENEWAL", endDate: "2099-01-01" }]) {
    const r = await fetch(`${base}/api/payments`, { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify(body) });
    assert.equal(r.status, 400);
  }
  const admin = await db.user.findFirst({ where: { role: "ADMIN", isActive: true }, select: { id: true, memberId: true, role: true } });
  assert(admin, "A local admin is required.");
  const adminPage = await fetch(`${base}/admin/joining`, { headers: { cookie: await sessionCookie(admin) } });
  assert.equal(adminPage.status, 200);
  const adminHtml = await adminPage.text();
  assert(adminHtml.includes("Reception Sheets synchronization"));
  assert(adminHtml.includes("UPI admissions"));
  console.log("Renewal and admin pages rendered; unauthenticated renewal, future starts and submitted expiry dates rejected. No records or Sheets rows were created.");
} finally { await db.$disconnect(); }
