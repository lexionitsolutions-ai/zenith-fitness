import type {MembershipSheetAdapter,RawMembershipRow} from "@/types/sheets";

export class LocalJsonAdapter {
  constructor(private rows: RawMembershipRow[]) {}

  async fetchMembershipRows() {
    return this.rows;
  }
}

export class GoogleAppsScriptAdapter implements MembershipSheetAdapter {
  constructor(
    private url = process.env.GOOGLE_SHEETS_API_URL,
    private secret = process.env.IMPORT_API_SECRET,
  ) {}

  async fetchMembershipRows() {
    if (!this.url) throw new Error("GOOGLE_SHEETS_API_URL is not configured");

    // The Zenith Apps Script serves the complete import payload from this action.
    // Preserve a manually supplied action so existing custom endpoint URLs keep working.
    const endpoint = new URL(this.url);
    if (!endpoint.searchParams.has("action")) {
      endpoint.searchParams.set("action", "getAllMembers");
    }

    const response = await fetch(endpoint, {
      headers: this.secret ? { "x-import-secret": this.secret } : undefined,
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Sheets endpoint returned ${response.status}`);

    const data: unknown = await response.json();
    const rows = Array.isArray(data)
      ? data
      : typeof data === "object" &&
          data !== null &&
          "members" in data &&
          Array.isArray(data.members)
        ? data.members
        : null;

    if (!rows) {
      throw new Error("Sheets endpoint must return an array or { success, members: [] }");
    }

    return rows as RawMembershipRow[];
  }
}
