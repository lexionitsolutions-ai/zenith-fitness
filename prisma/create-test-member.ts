import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";

// Prefer this project's .env over stale machine-level variables on Windows.
try {
  const environmentFile = readFileSync(".env", "utf8");
  for (const line of environmentFile.split(/\r?\n/)) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    const value = rawValue.trim().replace(/^(["'])(.*)\1$/, "$2");
    if (key !== "DATABASE_URL" || !process.env.DATABASE_URL) {
      process.env[key] = value;
    }
  }
} catch {
  // The validation below provides a clearer message when .env is unavailable.
}

const db = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Development only");
  }

  const admissionId = process.argv[2] || process.env.TEST_MEMBER_ADMISSION_ID;
  const pin = process.env.TEST_MEMBER_PIN;

  if (!admissionId || !pin || pin.length < 8) {
    throw new Error(
      "Set TEST_MEMBER_PIN to at least 8 characters in .env and provide an Admission ID",
    );
  }

  const member = await db.member.findUnique({
    where: { admissionId: admissionId.trim().toUpperCase() },
  });

  if (!member) throw new Error(`Imported member ${admissionId} was not found`);
  if (!member.mobileNumber) {
    throw new Error(`Member ${member.admissionId} has no valid mobile number`);
  }

  const pinHash = await bcrypt.hash(pin, 12);
  await db.user.upsert({
    where: { memberId: member.id },
    create: {
      memberId: member.id,
      mobileNumber: member.mobileNumber,
      pinHash,
      role: "MEMBER",
      mustChangePassword: true,
    },
    update: {
      mobileNumber: member.mobileNumber,
      pinHash,
      mustChangePassword: true,
      isActive: true,
      failedLoginCount: 0,
      lockedUntil: null,
    },
  });

  console.log(`Provisioned ${member.admissionId} (${member.mobileNumber})`);
}

main().finally(() => db.$disconnect());
