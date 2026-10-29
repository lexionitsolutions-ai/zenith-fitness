export const MEMBERSHIP_WHATSAPP_NUMBER = "918999699811";
export type MembershipMessageOrder = {
  id: string; kind: string; planName: string; durationMonths: number;
  amountDue: number; reportedAmount: number | null; pointsUsed: number; utr: string | null;
};
export function membershipWhatsAppUrl(person: { name: string; mobile: string }, order: MembershipMessageOrder) {
  const renewal = order.kind === "RENEWAL";
  const message = [
    "Hey Zenith Fitness,",
    "",
    `I have made the payment for my membership ${renewal ? "renewal" : "admission"}.`,
    "",
    `Name: ${person.name}`,
    `Contact no: ${person.mobile}`,
    `Plan: ${order.planName}`,
    `Duration: ${order.durationMonths} month${order.durationMonths === 1 ? "" : "s"}`,
    `Amount paid: Rs. ${(order.reportedAmount ?? order.amountDue).toLocaleString("en-IN")}`,
    ...(order.pointsUsed ? [`Points discount: Rs. ${order.pointsUsed.toLocaleString("en-IN")} (${order.pointsUsed} points)`] : []),
    `UTR: ${order.utr ?? ""}`,
    `Order: ${order.id}`,
    "",
    `Please approve my ${renewal ? "renewal" : "admission"}.`,
  ].join("\n");
  return `https://wa.me/${MEMBERSHIP_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
