import { getSession } from "./session";
import { requireActiveRole } from "./authorize";
import { requireVisitor } from "./visitor-session";
import { AppError } from "@/lib/errors";
export async function paymentOwner(kind: "ADMISSION" | "RENEWAL") {
  if (kind === "RENEWAL") {
    const session = await requireActiveRole(["MEMBER"]);
    if (!session.memberId || session.onboardingRequired) throw new AppError("MEMBER_REQUIRED", "Finish your member profile before renewing.", 403);
    return { memberId: session.memberId, visitorId: null };
  }
  const visitor = await requireVisitor();
  if (visitor.memberId) throw new AppError("ALREADY_MEMBER", "Use the renewal option in your member dashboard.");
  return { memberId: null, visitorId: visitor.id };
}
export async function currentPaymentOwner() {
  const session = await getSession();
  return paymentOwner(session?.role === "MEMBER" && session.memberId ? "RENEWAL" : "ADMISSION");
}
