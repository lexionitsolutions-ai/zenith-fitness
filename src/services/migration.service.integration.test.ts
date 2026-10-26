import { Prisma, PrismaClient } from "@prisma/client";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { runImport } from "./migration.service";

const { queries, database } = vi.hoisted(() => {
  const queries: { strings: TemplateStringsArray; values: unknown[] }[] = [];
  const transaction = {
    $executeRaw: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => { queries.push({ strings, values }); return Promise.resolve(1); }),
    migrationLog: { createMany: vi.fn() },
  };
  return { queries, database: {
    importBatch: { create: vi.fn(async () => ({ id: "batch" })), update: vi.fn() },
    membership: { findMany: vi.fn(async () => []) },
    $transaction: vi.fn(async (callback: (tx: typeof transaction) => Promise<void>) => callback(transaction)),
  } };
});
vi.mock("@/lib/database/prisma", () => ({ prisma: database }));
vi.mock("bcryptjs", () => ({ default: { hash: vi.fn(async () => "test-hash") } }));

// Run against PostgreSQL with TEST_DATABASE_URL. All writes use temporary tables on
// one connection; no application records are read or modified.
const url = process.env.TEST_DATABASE_URL;
const client = url ? new PrismaClient({ datasources: { db: { url } } }) : undefined;
beforeEach(() => { queries.length = 0; });

afterAll(async () => { await client?.$disconnect(); });

describe.skipIf(!client)("import profile preservation (PostgreSQL)", () => {
  it("preserves edited and cleared profiles on repeat imports while syncing memberships and initializing new profiles", async () => {
    vi.stubEnv("MEMBER_INITIAL_PIN", "test-password");
    const row = {
      sourceSheet: "regression", sourceRow: 1, admissionId: "ZF-TEST-1", name: "Sheet Name",
      gender: "Female", birthDate: "1990-01-01", address: "Sheet address", medicalHistory: "Sheet history",
      mobile: null, age: null, category: null, totalAmount: 1000, discount: 0, paymentMode: null, paymentStatus: null, remarks: null, timestamp: null, whatsappMessage: null, plan: "Monthly", startDate: "2026-10-01", endDate: "2026-10-31", finalAmount: 1000, amountPaid: 500, pendingAmount: 500,
    };
    try {
      await runImport({ fetchMembershipRows: async () => [row] }, "test");
      expect(queries).toHaveLength(5);
      const memberQuery = queries[0];
      const membershipQuery = queries[4];
      await client!.$transaction(async tx => {
        for (const table of ["Member", "Membership", "MembershipPlan"]) {
          await tx.$executeRawUnsafe(`CREATE TEMP TABLE "${table}" (LIKE public."${table}" INCLUDING ALL) ON COMMIT DROP`);
        }
        const execute = async (query: typeof memberQuery) => tx.$executeRaw(Prisma.sql(query.strings, ...query.values));
        await execute(memberQuery);
        await execute(membershipQuery);
        const initial = await tx.$queryRaw<{ fullName: string; address: string | null }[]>`SELECT "fullName", "address" FROM "Member"`;
        expect(initial).toEqual([{ fullName: "Sheet Name", address: "Sheet address" }]);
        // Simulate a member saving a new name/date and deliberately clearing fields.
        await tx.$executeRaw`UPDATE "Member" SET "fullName" = 'Saved Name', "gender" = NULL, "birthDate" = '1995-02-03'::date, "address" = 'Saved address', "medicalHistory" = NULL`;
        await tx.$executeRaw`UPDATE "Membership" SET "amountPaid" = 0`;
        await execute(memberQuery);
        await execute(membershipQuery);
        await execute(memberQuery);
        const profiles = await tx.$queryRaw<{ fullName: string; gender: string | null; birthDate: Date; address: string; medicalHistory: string | null }[]>`SELECT "fullName", "gender", "birthDate", "address", "medicalHistory" FROM "Member"`;
        expect(profiles).toEqual([{ fullName: "Saved Name", gender: null, birthDate: new Date("1995-02-03"), address: "Saved address", medicalHistory: null }]);
        const memberships = await tx.$queryRaw<{ amountPaid: Prisma.Decimal }[]>`SELECT "amountPaid" FROM "Membership"`;
        expect(memberships).toHaveLength(1);
        expect(Number(memberships[0].amountPaid)).toBe(500);
      }, { timeout: 20000 });
    } finally { vi.unstubAllEnvs(); }
  });
  it.each(["9876500001", null])("keeps admin phone changes through imports with sheet mobile %s", async (mobile) => {
    vi.stubEnv("MEMBER_INITIAL_PIN", "test-password");
    const row = {
      sourceSheet: "phone-regression", sourceRow: 1, admissionId: "ZF-TEST-2", name: "Phone Test",
      mobile, gender: null, age: null, birthDate: null, address: null, medicalHistory: null,
      category: null, totalAmount: 1000, discount: 0, paymentMode: null, paymentStatus: null,
      remarks: null, timestamp: null, whatsappMessage: null, plan: "Monthly", startDate: "2026-10-01",
      endDate: "2026-10-31", finalAmount: 1000, amountPaid: 1000, pendingAmount: 0,
    };
    try {
      await runImport({ fetchMembershipRows: async () => [row] }, "test");
      await client!.$transaction(async tx => {
        for (const table of ["Member", "User"]) {
          await tx.$executeRawUnsafe(`CREATE TEMP TABLE "${table}" (LIKE public."${table}" INCLUDING ALL) ON COMMIT DROP`);
        }
        const execute = async (query: typeof queries[number]) => tx.$executeRaw(Prisma.sql(query.strings, ...query.values));
        await execute(queries[0]);
        // Same atomic profile/login updates as the admin phone endpoint.
        await tx.$executeRaw`UPDATE "Member" SET "mobileNumber" = '9876500002', "originalMobileNumber" = '+91 9876500002'`;
        // Provisioning must use the saved phone even if the sheet is stale or blank.
        await execute(queries[3]);
        for (let repeat = 0; repeat < 2; repeat++) {
          for (const query of queries.slice(0, 4)) await execute(query);
        }
        expect(await tx.$queryRaw`SELECT "mobileNumber", "originalMobileNumber" FROM "Member"`).toEqual([
          { mobileNumber: "9876500002", originalMobileNumber: "+91 9876500002" },
        ]);
        expect(await tx.$queryRaw`SELECT "mobileNumber" FROM "User"`).toEqual([{ mobileNumber: "9876500002" }]);
        // Repair an older login that still contains the sheet phone.
        await tx.$executeRaw`UPDATE "User" SET "mobileNumber" = '9876500001'`;
        await execute(queries[1]);
        expect(await tx.$queryRaw`SELECT "mobileNumber" FROM "User"`).toEqual([{ mobileNumber: "9876500002" }]);
      }, { timeout: 20000 });
    } finally { vi.unstubAllEnvs(); }
  });

});
