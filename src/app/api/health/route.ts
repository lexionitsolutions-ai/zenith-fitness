import { prisma } from "@/lib/database/prisma";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT "gymId" FROM zenith_app."ManagementSyncConfig" WHERE id=1`;
    return Response.json({ status: "ok", database: "connected", membershipSource: "supabase", automaticSync: true });
  } catch { return Response.json({ status: "unavailable" }, { status: 503 }); }
}
