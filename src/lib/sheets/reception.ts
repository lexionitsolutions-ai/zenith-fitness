// Deployment URLs supplied with the reception interface. Kept server-side.
const receptionUrl = "https://script.google.com/macros/s/AKfycbwVjje6NL54Uj8HghM-seBsHaHkuAdLRO9JZZ1jhYWo10KnnVNHxdW4TVn42xvIPJ5GkA/exec";
const enquiryUrl = "https://script.google.com/macros/s/AKfycbyt3UviMpgrQfPbFtk8dLkrBLNn1IjTpFpLnOa42012GtQWNxp1CuGj4peDbIoc3XGq/exec";
export type ReceptionPayload = Record<string, string>;
export type SheetReceipt = { admissionId: string; sourceSheet: string; sourceRow: number };
export function receptionEndpoint(kind: string) {
  const raw = kind === "ENQUIRY" ? process.env.GOOGLE_SHEETS_ENQUIRY_URL || enquiryUrl : process.env.GOOGLE_SHEETS_WRITE_URL || receptionUrl;
  const url = new URL(raw);
  if (url.protocol !== "https:" || url.hostname !== "script.google.com" || !url.pathname.endsWith("/exec")) throw new Error("Configure a deployed Apps Script /exec URL.");
  url.search = "";
  return url;
}
export function sheetText(value: string | null | undefined) {
  const text = value ?? "";
  return /^[=+\-@]/.test(text.trimStart()) ? `'${text}` : text;
}
export async function findReceptionRow(payload: ReceptionPayload): Promise<SheetReceipt | null> {
  const url = receptionEndpoint("ORDER");
  url.searchParams.set("action", "getMembershipRows");
  const r = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error("Unable to read membership rows from the reception script.");
  const body = await r.json();
  if (body.success !== true || !Array.isArray(body.members)) throw new Error("The reception deployment must support getMembershipRows from the supplied Apps Script.");
  const marker = `ZenithApp:${payload.reference}`;
  const expectedSheet = (payload.action === "saveRenewal" ? { "30": "Renewals 1M", "90": "Renewals 3M", "180": "Renewals 6M", "365": "Renewals 1Y" } : { "30": "1 Month", "90": "3 Months", "180": "6 Months", "365": "1 Year" })[payload.plan as "30" | "90" | "180" | "365"];
  const matches = body.members.filter((row: Record<string, unknown>) => String(row.remarks ?? "").includes(marker));
  if (matches.length > 1) throw new Error("Duplicate order reference found in Sheets. Ask reception to resolve it.");
  if (!matches.length) return null;
  const row = matches[0];
  if (row.sourceSheet !== expectedSheet || Number(row.finalAmount) !== Number(payload.finalAmount) || String(row.mobile).replace(/\D/g, "").slice(-10) !== payload.mobile || !Number.isInteger(Number(row.sourceRow)) || Number(row.sourceRow) < 2 || !row.admissionId) throw new Error("The sheet entry does not match this approved payment.");
  if (payload.action === "saveRenewal" && row.admissionId !== payload.admissionId) throw new Error("The renewal sheet admission ID does not match this member.");
  return { admissionId: String(row.admissionId), sourceSheet: String(row.sourceSheet), sourceRow: Number(row.sourceRow) };
}
export async function postReception(payload: ReceptionPayload, kind: string) {
  const { reference, localMemberId, localMembershipId, ...fields } = payload;
  const response = await fetch(receptionEndpoint(kind), { method: "POST", body: new URLSearchParams(fields), cache: "no-store", signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error("Reception did not confirm the sheet write. Check the sheet before retrying.");
  const data = await response.json();
  if (data.success !== true) throw new Error(typeof data.message === "string" ? data.message.slice(0, 200) : "Reception did not confirm the sheet write.");
  return { admissionId: typeof data.admissionId === "string" ? data.admissionId : null };
}
