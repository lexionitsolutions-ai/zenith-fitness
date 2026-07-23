import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";

try {
  const environmentFile = readFileSync(".env", "utf8");
  for (const line of environmentFile.split(/\r?\n/)) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (key !== "DATABASE_URL" || !process.env.DATABASE_URL) {
      process.env[key] = rawValue.trim().replace(/^(["'])(.*)\1$/, "$2");
    }
  }
} catch {
  // Validation below provides a useful error when configuration is missing.
}

const db = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Bulk common-PIN provisioning is disabled in production");
  }

  const pin = process.argv[2] || process.env.BULK_MEMBER_PIN;
  if (!pin || pin.length < 8) {
    throw new Error("Pass a temporary PIN of at least 8 characters");
  }

  const members = await db.member.findMany({
    orderBy: { admissionId: "asc" },
    select: { id: true, admissionId: true, mobileNumber: true },
  });
  const valid = members.filter((member) => member.mobileNumber);
  const groups = new Map<string, typeof valid>();
  for (const member of valid) {
    const group = groups.get(member.mobileNumber!) ?? [];
    group.push(member);
    groups.set(member.mobileNumber!, group);
  }

  const duplicateGroups = [...groups.entries()].filter(([, group]) => group.length > 1);
  const uniqueMembers = [...groups.values()].filter((group) => group.length === 1).map((group) => group[0]);
  const pinHash = await bcrypt.hash(pin, 12);
  let provisioned = 0;
  let skippedAdmin = 0;

  for (const member of uniqueMembers) {
    const existingMobileUser = await db.user.findUnique({ where: { mobileNumber: member.mobileNumber! } });
    if (existingMobileUser?.role === "ADMIN") {
      skippedAdmin++;
      continue;
    }
    await db.user.upsert({
      where: { memberId: member.id },
      create: { memberId: member.id, mobileNumber: member.mobileNumber!, pinHash, role: "MEMBER", mustChangePassword: true },
      update: { mobileNumber: member.mobileNumber!, pinHash, role: "MEMBER", mustChangePassword: true, isActive: true, failedLoginCount: 0, lockedUntil: null },
    });
    provisioned++;
  }

  console.log(JSON.stringify({
    totalMembers: members.length,
    provisioned,
    missingOrInvalidMobile: members.length - valid.length,
    duplicateMobileGroups: duplicateGroups.length,
    membersInDuplicateGroups: duplicateGroups.reduce((total, [, group]) => total + group.length, 0),
    skippedAdmin,
    duplicateAdmissionIds: duplicateGroups.map(([, group]) => group.map((member) => member.admissionId)),
  }, null, 2));
}

main().finally(() => db.$disconnect());
