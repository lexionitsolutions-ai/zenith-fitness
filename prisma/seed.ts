import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";
import { syncWorkoutCards } from "../src/lib/workouts/sync";

try {
  for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match && (match[1] !== "DATABASE_URL" || !process.env.DATABASE_URL)) {
      process.env[match[1]] = match[2].trim().replace(/^(["'])(.*)\1$/, "$2");
    }
  }
} catch {}

const db = new PrismaClient();


const normalize = (raw: string) => {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? `+91${digits}` : null;
};

async function upsertLogin(name: string, mobileRaw: string, pin: string, role: "ADMIN" | "STAFF") {
  const mobile = normalize(mobileRaw);
  if (!mobile) throw new Error(`${name} has an invalid Indian mobile number`);
  if (pin.length < 8) throw new Error(`${name}'s PIN must contain at least 8 characters`);
  const pinHash = await bcrypt.hash(pin, 12);
  await db.user.upsert({
    where: { mobileNumber: mobile },
    create: { displayName: name, mobileNumber: mobile, pinHash, role, mobileVerified: true },
    update: { displayName: name, pinHash, role, isActive: true, failedLoginCount: 0, lockedUntil: null },
  });
  return mobile;
}

async function seedMembershipAccess() {
  for (const [planCode, planName, durationDays] of [
    ["PLAN_30_DAYS", "1 Month", 30],
    ["PLAN_90_DAYS", "3 Months", 90],
    ["PLAN_180_DAYS", "6 Months", 180],
    ["PLAN_365_DAYS", "1 Year", 365],
  ] as const) {
    await db.membershipPlan.upsert({ where: { planCode }, create: { planCode, planName, durationDays }, update: { planName, durationDays } });
  }

  const adminPin = process.env.ADMIN_PIN;
  if (!adminPin) throw new Error("ADMIN_PIN is required");
  const adminMobile = await upsertLogin(process.env.ADMIN_NAME ?? "Administrator", process.env.ADMIN_MOBILE ?? "", adminPin, "ADMIN");
  const allowedStaff: string[] = [];
  for (const key of ["ARIF", "LAKHAN", "SONALI", "SAKSHI", "ATHARVA", "TRAINER1"]) {
    const name = process.env[`STAFF_${key}_NAME`];
    const mobile = process.env[`STAFF_${key}_MOBILE`];
    const pin = process.env[`STAFF_${key}_PIN`];
    if (!name && !mobile && !pin) continue;
    if (!name || !mobile || !pin) throw new Error(`Incomplete STAFF_${key} configuration`);
    allowedStaff.push(await upsertLogin(name, mobile, pin, "STAFF"));
  }
  await db.user.updateMany({ where: { role: "ADMIN", mobileNumber: { not: adminMobile } }, data: { isActive: false } });
  await db.user.updateMany({ where: { role: "STAFF", mobileNumber: { notIn: allowedStaff } }, data: { isActive: false } });
  console.log(`Seeded plans, admin, and ${allowedStaff.length} staff accounts`);
}

async function main() {
  await seedMembershipAccess();
  await db.$transaction((tx) => syncWorkoutCards(tx), { timeout: 120000 });
}

main().finally(() => db.$disconnect());
