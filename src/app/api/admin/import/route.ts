import { requireActiveRole } from "@/lib/auth/authorize";
import { prisma } from "@/lib/database/prisma";
import { AppError, apiError } from "@/lib/errors";
export const maxDuration = 300;
// Normal changes arrive in the management write's transaction. This is an
// admin-only, repeat-safe recovery operation, not a recurring import step.
export async function POST(req: Request) {
  try {
    await requireActiveRole(["ADMIN"]);
    const { source } = await req.json();
    if (source !== "supabase") throw new AppError("SOURCE_CHANGED", "Supabase is the membership source. Sheets imports are disabled.", 409);
    const result = await prisma.$queryRaw<{ members: number }[]>`SELECT zenith_app.sync_management_all() AS members`;
    return Response.json({ success: true, data: { members: result[0].members, automaticSync: true } });
  } catch (error) { return apiError(error); }
}
export async function GET() {
  try {
    await requireActiveRole(["ADMIN"]);
    const data = await prisma.importBatch.findMany({ take: 10, orderBy: { createdAt: "desc" }, include: { logs: { where: { status: { in: ["WARNING", "FAILED"] } }, take: 50 } } });
    return Response.json({ success: true, data, source: "supabase", automaticSync: true });
  } catch (error) { return apiError(error); }
}
