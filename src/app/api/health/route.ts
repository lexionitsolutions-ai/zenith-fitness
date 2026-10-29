import { prisma } from "@/lib/database/prisma";
export const dynamic = "force-dynamic";
function healthHeaders(databaseMs: number) {
  let databaseRegion = "unknown";
  try {
    // Region only: never expose the hostname, project ID or connection string.
    const host = new URL(process.env.DATABASE_URL ?? "").hostname;
    databaseRegion = host.match(/(?:^|\.)(?:aws-\d+-)?([a-z]{2}(?:-[a-z]+)+-\d)\.pooler\.supabase\.com$/)?.[1] ?? "unknown";
  } catch {}
  return {
    "Server-Timing": `db;dur=${databaseMs.toFixed(1)}`,
    "X-Database-Region": databaseRegion,
    "Cache-Control": "no-store",
  };
}
export async function GET() {
  const started = performance.now();
  try {
    await prisma.$queryRaw`SELECT "gymId" FROM zenith_app."ManagementSyncConfig" WHERE id=1`;
    return Response.json({ status: "ok", database: "connected", membershipSource: "supabase", automaticSync: true }, { headers: healthHeaders(performance.now() - started) });
  } catch { return Response.json({ status: "unavailable" }, { status: 503, headers: healthHeaders(performance.now() - started) }); }
}
