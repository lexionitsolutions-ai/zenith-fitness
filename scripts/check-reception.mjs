import { readFileSync } from "node:fs";
const source = readFileSync("src/lib/sheets/reception.ts", "utf8");
const endpoint = process.env.GOOGLE_SHEETS_WRITE_URL || source.match(/const receptionUrl = "([^"]+)"/)[1];
const url = new URL(endpoint);
url.searchParams.set("action", "getMembershipRows");
const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
if (!response.ok) throw new Error(`Reception HTTP ${response.status}`);
const data = await response.json();
if (data.success !== true || !Array.isArray(data.members)) throw new Error("Reception deployment does not support getMembershipRows. Redeploy the supplied Apps Script before enabling reliable app synchronization.");
console.log(`Reception read interface verified: ${data.members.length} membership rows, no writes performed.`);
for (const key of ["sourceSheet", "sourceRow", "admissionId", "mobile", "finalAmount", "remarks"]) {
  if (!data.members.some(row => key in row)) throw new Error(`Missing reception export field: ${key}`);
}
console.log("Reception export includes the row identities and payment fields needed for safe reconciliation.");
