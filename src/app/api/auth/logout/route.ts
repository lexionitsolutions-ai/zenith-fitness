import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth/session";

export async function GET(request: Request) {
  await clearSession();
  const url = new URL(request.url);
  return NextResponse.redirect(new URL(url.searchParams.get("next") || "/login", url.origin));
}

export async function POST() {
  await clearSession();
  return Response.json({ success: true });
}
