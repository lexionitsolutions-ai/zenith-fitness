import { z } from "zod";
import { indiaToday } from "./visitor";
export const membershipStartInput = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(`${value}T00:00:00Z`);
  return !isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value && value >= "1900-01-01" && value <= indiaToday();
}, "Start date must be today or an earlier valid date.");
// Match reception: expiry = start + plan days.
export function membershipEndDate(start: string, days: number) {
  const date = new Date(`${start}T00:00:00Z`);
  if (!Number.isInteger(days) || days <= 0 || days > 3660 || isNaN(date.valueOf())) throw new Error("Invalid membership dates");
  return new Date(date.valueOf() + days * 86400000).toISOString().slice(0, 10);
}
