import { z } from "zod";
import { normalizeIndianMobile } from "./utils/normalization";

export function indiaToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
export const mobileInput = z.string().max(30).transform(normalizeIndianMobile).refine((v): v is string => v !== null, "Enter a valid Indian mobile number.");
export const nameInput = z.string().trim().min(2, "Enter your name.").max(100);
export const enquiryInput = z.object({
  name: nameInput,
  contact: mobileInput,
  trialDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => {
    const date = new Date(`${v}T00:00:00Z`);
    return !isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === v && v >= indiaToday();
  }, "Choose today or a future trial date."),
});
export const UPI_ID = "zenithfitness360@okicici";
export const PAYEE_NAME = "Zenith Fitness";
export function upiPaymentUri(amount: string, reference: string) {
  if (!/^\d+\.\d{2}$/.test(amount) || Number(amount) <= 0 || !Number.isFinite(Number(amount))) throw new Error("Invalid payment amount");
  if (!/^[A-Za-z0-9]{1,40}$/.test(reference)) throw new Error("Invalid payment reference");
  const fields = { pa: UPI_ID, pn: PAYEE_NAME, am: amount, cu: "INR", tr: reference, tn: `Zenith membership ${reference}` };
  // UPI handlers do not consistently decode form-style '+' spaces.
  const query = Object.entries(fields).map(([key, value]) => `${key}=${encodeURIComponent(value)}`).join("&");
  return `upi://pay?${query}`;
}
