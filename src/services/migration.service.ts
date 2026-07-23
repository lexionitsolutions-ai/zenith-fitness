import bcrypt from "bcryptjs";
import { prisma } from "@/lib/database/prisma";
import type { MembershipSheetAdapter, RawMembershipRow } from "@/types/sheets";
import { calculateMembershipStatus, calculatePaymentStatus } from "@/lib/utils/status";
import { cleanOptional, normalizeAdmissionId, normalizeIndianMobile, parseCurrency, parseSheetDate, resolvePlan } from "@/lib/utils/normalization";

type ImportRow = {
  sourceSheet: string; sourceRow: number; admissionId: string; fullName: string; mobileNumber: string | null; originalMobileNumber: string | null;
  gender: string | null; ageAtImport: number | null; birthDate: string | null; address: string | null; medicalHistory: string | null;
  planCode: string | null; planDays: number | null; category: string | null; startDate: string | null; endDate: string | null;
  totalAmount: number; discountAmount: number; finalAmount: number; amountPaid: number; pendingAmount: number; paymentMode: string | null;
  paymentStatus: string; sourcePaymentStatus: string | null; membershipStatus: string; remarks: string | null; sourceTimestamp: string | null;
  warningMessage: string | null; rawData: object;
};

const blank = (row: RawMembershipRow) => Object.entries(row).filter(([key]) => !["sourceSheet", "sourceRow"].includes(key)).every(([, value]) => value == null || String(value).trim() === "");
const source = (row: RawMembershipRow, index: number) => ({ ...row, sourceSheet: cleanOptional(row.sourceSheet) ?? "Google Sheets", sourceRow: Number.isInteger(Number(row.sourceRow)) && Number(row.sourceRow) > 0 ? Number(row.sourceRow) : index + 1 });
const date = (value: Date | null) => value?.toISOString() ?? null;

export async function runImport(adapter: MembershipSheetAdapter, initiatedBy: string) {
  const initialPin = process.env.MEMBER_INITIAL_PIN;
  if (!initialPin || initialPin.length < 8) throw new Error("MEMBER_INITIAL_PIN must contain at least 8 characters before importing members");

  const rows = await adapter.fetchMembershipRows();
  const batch = await prisma.importBatch.create({ data: { initiatedBy, status: "PROCESSING", totalRows: rows.length } });
  const records: ImportRow[] = [];
  const failures: { sourceSheet: string; sourceRow: number; admissionId: string | null; rawData: object; errorMessage: string }[] = [];
  let skippedRows = 0;

  for (const [index, input] of rows.entries()) {
    const row = source(input, index);
    if (blank(row)) { skippedRows++; continue; }
    const admissionId = normalizeAdmissionId(row.admissionId);
    if (!admissionId) { failures.push({ sourceSheet: row.sourceSheet, sourceRow: row.sourceRow, admissionId: null, rawData: row, errorMessage: "Admission ID is required" }); continue; }
    const startDate = parseSheetDate(row.startDate);
    const endDate = parseSheetDate(row.endDate);
    const plan = resolvePlan(row.plan, row.sourceSheet, startDate, endDate);
    const warningMessage = plan ? null : `Unknown membership plan: ${cleanOptional(row.plan) ?? "blank"}`;
    const finalAmount = parseCurrency(row.finalAmount);
    const amountPaid = parseCurrency(row.amountPaid);
    const pendingAmount = parseCurrency(row.pendingAmount);
    records.push({
      sourceSheet: row.sourceSheet, sourceRow: row.sourceRow, admissionId, fullName: cleanOptional(row.name) ?? "Unknown member", mobileNumber: normalizeIndianMobile(row.mobile), originalMobileNumber: cleanOptional(row.mobile),
      gender: cleanOptional(row.gender), ageAtImport: Number(row.age) || null, birthDate: date(parseSheetDate(row.birthDate)), address: cleanOptional(row.address), medicalHistory: cleanOptional(row.medicalHistory),
      planCode: plan?.code ?? null, planDays: plan?.days ?? null, category: cleanOptional(row.category), startDate: date(startDate), endDate: date(endDate),
      totalAmount: parseCurrency(row.totalAmount), discountAmount: parseCurrency(row.discount), finalAmount, amountPaid, pendingAmount, paymentMode: cleanOptional(row.paymentMode),
      paymentStatus: calculatePaymentStatus(finalAmount, amountPaid, pendingAmount), sourcePaymentStatus: cleanOptional(row.paymentStatus), membershipStatus: plan ? calculateMembershipStatus(startDate, endDate) : "REVIEW_REQUIRED",
      remarks: cleanOptional(row.remarks), sourceTimestamp: date(parseSheetDate(row.timestamp)), warningMessage, rawData: row,
    });
  }

  if (!records.length) return prisma.importBatch.update({ where: { id: batch.id }, data: { skippedRows, failedRows: failures.length, completedAt: new Date(), status: failures.length ? "COMPLETED_WITH_WARNINGS" : "COMPLETED" } });

  const existing = await prisma.membership.findMany({ where: { OR: records.map((row) => ({ sourceSheet: row.sourceSheet, sourceRow: row.sourceRow })) }, select: { sourceSheet: true, sourceRow: true } });
  const existingKeys = new Set(existing.map((row) => `${row.sourceSheet}:${row.sourceRow}`));
  const payload = JSON.stringify(records);
  const pinHash = await bcrypt.hash(initialPin, 12);

  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.$executeRaw`
        WITH rows AS (SELECT value AS row FROM jsonb_array_elements(${payload}::jsonb)), latest AS (
          SELECT DISTINCT ON (row->>'admissionId') row FROM rows ORDER BY row->>'admissionId', (row->>'sourceRow')::int DESC
        )
        INSERT INTO "Member" ("id", "admissionId", "fullName", "mobileNumber", "originalMobileNumber", "gender", "ageAtImport", "birthDate", "address", "medicalHistory", "sourceSheet", "sourceRow", "updatedAt")
        SELECT gen_random_uuid(), row->>'admissionId', row->>'fullName', NULLIF(row->>'mobileNumber',''), NULLIF(row->>'originalMobileNumber',''), NULLIF(row->>'gender',''), NULLIF(row->>'ageAtImport','')::int, NULLIF(row->>'birthDate','')::date, NULLIF(row->>'address',''), NULLIF(row->>'medicalHistory',''), row->>'sourceSheet', (row->>'sourceRow')::int, CURRENT_TIMESTAMP FROM latest
        ON CONFLICT ("admissionId") DO UPDATE SET "fullName" = EXCLUDED."fullName", "mobileNumber" = COALESCE(EXCLUDED."mobileNumber", "Member"."mobileNumber"), "originalMobileNumber" = COALESCE(EXCLUDED."originalMobileNumber", "Member"."originalMobileNumber"), "gender" = COALESCE(EXCLUDED."gender", "Member"."gender"), "ageAtImport" = COALESCE(EXCLUDED."ageAtImport", "Member"."ageAtImport"), "birthDate" = COALESCE(EXCLUDED."birthDate", "Member"."birthDate"), "address" = COALESCE(EXCLUDED."address", "Member"."address"), "medicalHistory" = COALESCE(EXCLUDED."medicalHistory", "Member"."medicalHistory"), "sourceSheet" = EXCLUDED."sourceSheet", "sourceRow" = EXCLUDED."sourceRow", "updatedAt" = CURRENT_TIMESTAMP`;
      await transaction.$executeRaw`
        WITH rows AS (SELECT value AS row FROM jsonb_array_elements(${payload}::jsonb)), latest AS (
          SELECT DISTINCT ON (row->>'admissionId') row FROM rows WHERE NULLIF(row->>'mobileNumber','') IS NOT NULL ORDER BY row->>'admissionId', (row->>'sourceRow')::int DESC
        )
        UPDATE "User" AS user_record SET "pinHash" = ${pinHash}, "isActive" = true, "failedLoginCount" = 0, "lockedUntil" = NULL, "updatedAt" = CURRENT_TIMESTAMP
        FROM "Member" AS member_record JOIN latest ON latest.row->>'admissionId' = member_record."admissionId"
        WHERE user_record."memberId" = member_record.id AND user_record.role = 'MEMBER'::"Role" AND user_record."mustChangePassword" = true`;
      await transaction.$executeRaw`
        WITH rows AS (SELECT value AS row FROM jsonb_array_elements(${payload}::jsonb)), latest AS (
          SELECT DISTINCT ON (row->>'admissionId') row FROM rows WHERE NULLIF(row->>'mobileNumber','') IS NOT NULL ORDER BY row->>'admissionId', (row->>'sourceRow')::int DESC
        )
        INSERT INTO "User" ("id", "memberId", "mobileNumber", "pinHash", "role", "mustChangePassword", "updatedAt")
        SELECT gen_random_uuid(), member_record.id, latest.row->>'mobileNumber', ${pinHash}, 'MEMBER'::"Role", true, CURRENT_TIMESTAMP FROM "Member" AS member_record JOIN latest ON latest.row->>'admissionId' = member_record."admissionId"
        WHERE NOT EXISTS (SELECT 1 FROM "User" AS user_record WHERE user_record."memberId" = member_record.id OR user_record."mobileNumber" = latest.row->>'mobileNumber')
        ON CONFLICT DO NOTHING`;
      await transaction.$executeRaw`
        WITH rows AS (SELECT value AS row FROM jsonb_array_elements(${payload}::jsonb))
        INSERT INTO "Membership" ("id", "memberId", "planId", "planDays", "category", "startDate", "endDate", "totalAmount", "discountAmount", "finalAmount", "amountPaid", "pendingAmount", "paymentMode", "paymentStatus", "sourcePaymentStatus", "membershipStatus", "remarks", "sourceSheet", "sourceRow", "sourceType", "sourceTimestamp", "updatedAt")
        SELECT gen_random_uuid(), member_record.id, plan_record.id, NULLIF(row->>'planDays','')::int, NULLIF(row->>'category',''), NULLIF(row->>'startDate','')::date, NULLIF(row->>'endDate','')::date, (row->>'totalAmount')::numeric, (row->>'discountAmount')::numeric, (row->>'finalAmount')::numeric, (row->>'amountPaid')::numeric, (row->>'pendingAmount')::numeric, NULLIF(row->>'paymentMode',''), (row->>'paymentStatus')::"PaymentStatus", NULLIF(row->>'sourcePaymentStatus',''), (row->>'membershipStatus')::"MembershipStatus", NULLIF(row->>'remarks',''), row->>'sourceSheet', (row->>'sourceRow')::int, 'LEGACY_IMPORT'::"SourceType", NULLIF(row->>'sourceTimestamp','')::timestamp, CURRENT_TIMESTAMP
        FROM rows JOIN "Member" AS member_record ON member_record."admissionId" = row->>'admissionId' LEFT JOIN "MembershipPlan" AS plan_record ON plan_record."planCode" = row->>'planCode'
        ON CONFLICT ("sourceSheet", "sourceRow") DO UPDATE SET "memberId" = EXCLUDED."memberId", "planId" = EXCLUDED."planId", "planDays" = EXCLUDED."planDays", "category" = EXCLUDED."category", "startDate" = EXCLUDED."startDate", "endDate" = EXCLUDED."endDate", "totalAmount" = EXCLUDED."totalAmount", "discountAmount" = EXCLUDED."discountAmount", "finalAmount" = EXCLUDED."finalAmount", "amountPaid" = EXCLUDED."amountPaid", "pendingAmount" = EXCLUDED."pendingAmount", "paymentMode" = EXCLUDED."paymentMode", "paymentStatus" = EXCLUDED."paymentStatus", "sourcePaymentStatus" = EXCLUDED."sourcePaymentStatus", "membershipStatus" = EXCLUDED."membershipStatus", "remarks" = EXCLUDED."remarks", "sourceType" = EXCLUDED."sourceType", "sourceTimestamp" = EXCLUDED."sourceTimestamp", "updatedAt" = CURRENT_TIMESTAMP`;
      await transaction.migrationLog.createMany({ data: records.map((row) => ({ batchId: batch.id, sourceSheet: row.sourceSheet, sourceRow: row.sourceRow, admissionId: row.admissionId, status: row.warningMessage ? "WARNING" : existingKeys.has(`${row.sourceSheet}:${row.sourceRow}`) ? "UPDATED" : "MIGRATED", warningMessage: row.warningMessage, rawData: row.rawData })) });
      if (failures.length) await transaction.migrationLog.createMany({ data: failures.map((row) => ({ batchId: batch.id, sourceSheet: row.sourceSheet, sourceRow: row.sourceRow, admissionId: row.admissionId, status: "FAILED", errorMessage: row.errorMessage, rawData: row.rawData })) });
    }, { maxWait: 15_000, timeout: 60_000 });
  } catch (error) {
    await prisma.importBatch.update({ where: { id: batch.id }, data: { failedRows: records.length + failures.length, completedAt: new Date(), status: "FAILED" } });
    throw error;
  }

  const warningRows = records.filter((row) => row.warningMessage).length;
  return prisma.importBatch.update({ where: { id: batch.id }, data: { successfulRows: records.length - existingKeys.size, updatedRows: existingKeys.size, skippedRows, warningRows, failedRows: failures.length, completedAt: new Date(), status: failures.length || warningRows ? "COMPLETED_WITH_WARNINGS" : "COMPLETED" }, include: { logs: true } });
}
