import { z } from "zod";
export const UPI_ID = "9272112745.etb@icici";
export const UPI_PAYEE = "RAJVARDHAN HEMANT PATIL HUF";
export const indiaToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
export const submitRenewalInput = z.object({ id: z.string().uuid(), utr: z.string().trim().regex(/^\d{12}$/, "Enter the 12-digit UPI transaction reference.") }).strict();
export function renewalDates(today: string, latestEnd: string | null, days: number) {
  const next = latestEnd ? new Date(`${latestEnd}T00:00:00Z`) : null;
  if (next) next.setUTCDate(next.getUTCDate() + 1);
  const start = next && next.toISOString().slice(0, 10) > today ? next.toISOString().slice(0, 10) : today;
  const end = new Date(`${start}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + days);
  return { start, end: end.toISOString().slice(0, 10) };
}
export function upiUri(amount: string, reference: string) {
  return `upi://pay?${new URLSearchParams({ pa: UPI_ID, pn: UPI_PAYEE, am: amount, cu: "INR", tr: reference, tn: `Zenith Fitness renewal ${reference}` }).toString().replace(/\+/g, "%20")}`;
}
