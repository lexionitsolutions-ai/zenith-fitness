import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth/session";

export async function GET(request: Request) {
  // GET can be prefetched by Next.js or the browser. Only an explicit POST
  // should clear a session, never a background navigation request.
  const url = new URL(request.url);
  return NextResponse.redirect(new URL("/login", url.origin));
}

export async function POST() {
  await clearSession();
  return Response.json({ success: true });
}
