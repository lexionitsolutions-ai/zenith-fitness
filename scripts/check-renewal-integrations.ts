import { PrismaClient } from "@prisma/client";
import { receptionEndpoint } from "../src/lib/sheets/reception";
async function main() {
  const db = new PrismaClient();
  try {
    await Promise.all([db.renewalRequest.count(), db.renewalSheetsJob.count()]);
    console.log("Renewal database tables: available");
    const url = receptionEndpoint("RENEWAL"); url.searchParams.set("action", "getMembershipRows");
    const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
    const data = await response.json();
    if (!response.ok || data.success !== true || !Array.isArray(data.members)) throw new Error("Reception must expose getMembershipRows for safe renewal delivery.");
    console.log("Reception membership export: available (read-only check; no rows written)");
  } finally { await db.$disconnect(); }
}
main().catch(e => { console.error(e instanceof Error ? e.message : "Integration check failed"); process.exitCode = 1; });
