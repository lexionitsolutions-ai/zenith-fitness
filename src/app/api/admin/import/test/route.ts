import { requireActiveRole } from "@/lib/auth/authorize";
import { AppError, apiError } from "@/lib/errors";
export async function POST() {
  try {
    await requireActiveRole(["ADMIN"]);
    throw new AppError("SOURCE_CHANGED", "Sheets imports are disabled. Memberships update automatically from Supabase.", 409);
  } catch (error) { return apiError(error); }
}
