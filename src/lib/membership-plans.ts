export const MERCHANT = { name: "T B PATIL AND CO", upiId: "9545405777@okbizaxis" };
const durations = [1, 3, 6, 12] as const;
const caps = [100, 300, 500, 700];
export const MEMBERSHIP_PLANS = [
  { category: "MALE", label: "Male", prices: [2000, 4699, 6499, 9991] },
  { category: "FEMALE", label: "Female", prices: [1499, 3999, 5699, 8999] },
  { category: "FEMALE_HAPPY", label: "Female · Happy Hours", prices: [1000, 3000, 4500, 6000] },
].flatMap(group => durations.map((months, i) => ({
  code: `${group.category}_${months}`, category: group.category, label: group.label,
  months, name: `${months === 12 ? "1 Year" : `${months} Month${months > 1 ? "s" : ""}`} · ${group.label}`,
  price: group.prices[i], discountCap: group.category === "FEMALE_HAPPY" ? 0 : caps[i], dietIncluded: months >= 3,
})));
export type PurchasePlan = typeof MEMBERSHIP_PLANS[number];
export function renewalDiscount(balance: number, cap: number, price: number) {
  return Math.max(0, Math.min(Math.floor(balance), cap, price));
}
export function planForGender(code: string, gender: string | null | undefined) {
  const plan = MEMBERSHIP_PLANS.find(p => p.code === code);
  const normalized = gender?.trim().toLowerCase();
  if (!plan || (plan.category === "MALE" ? !["male", "m"].includes(normalized ?? "") : !["female", "f"].includes(normalized ?? ""))) return null;
  return plan;
}
export function upiPaymentUrl(order: { id: string; amountDue: number }) {
  const query = new URLSearchParams({ pa: MERCHANT.upiId, pn: MERCHANT.name, am: order.amountDue.toFixed(2), cu: "INR", tn: `Zenith ${order.id}`, tr: order.id });
  return `upi://pay?${query}`;
}
// Calendar months, clamped at month end; periods include both dates.
export function membershipPeriod(months: number, latestEnd: Date | null, today: Date) {
  const start = new Date(today);
  start.setUTCHours(0, 0, 0, 0);
  if (latestEnd && latestEnd >= start) { start.setTime(latestEnd.getTime()); start.setUTCDate(start.getUTCDate() + 1); }
  const next = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + months, 1));
  const last = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(start.getUTCDate(), last));
  next.setUTCDate(next.getUTCDate() - 1);
  return { start, end: next };
}
