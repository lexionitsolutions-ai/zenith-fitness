import { getSession } from "@/lib/auth/session";
import { LocalJsonAdapter, GoogleAppsScriptAdapter } from "@/lib/sheets/adapters";
import { runImport } from "@/services/migration.service";
import { AppError, apiError } from "@/lib/errors";
import sample from "@/data/sample-memberships.json";

// A full Sheets import may process hundreds of rows and perform several
// database operations per row.
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (session?.role !== "ADMIN") {
      throw new AppError("FORBIDDEN", "Administrator access required.", 403);
    }

    const { source } = (await req.json()) as { source: "local" | "google" };
    const adapter = source === "local"
      ? new LocalJsonAdapter(sample as never)
      : new GoogleAppsScriptAdapter();

    return Response.json({ success: true, data: await runImport(adapter, session.userId) });
  } catch (error) {
    // This route is admin-only. Log the full cause and return its safe message so
    // import configuration/data issues can be corrected without guessing.
    console.error("Membership import failed", error);
    const message = error instanceof Error ? error.message : "The membership import failed.";
    return Response.json(
      { success: false, error: { code: "IMPORT_FAILED", message } },
      { status: 500 },
    );
  }
}
export async function GET(){try{const s=await getSession();if(s?.role!=='ADMIN')throw new AppError('FORBIDDEN','Administrator access required.',403);const {prisma}=await import('@/lib/database/prisma');return Response.json({success:true,data:await prisma.importBatch.findMany({take:10,orderBy:{createdAt:'desc'},include:{logs:{where:{status:{in:['WARNING','FAILED']}},take:50}}})})}catch(e){return apiError(e)}}
