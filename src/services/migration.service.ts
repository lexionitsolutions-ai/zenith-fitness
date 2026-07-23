import bcrypt from "bcryptjs";
import { prisma } from "@/lib/database/prisma";
import type { MembershipSheetAdapter, RawMembershipRow } from "@/types/sheets";
import { calculateMembershipStatus, calculatePaymentStatus } from "@/lib/utils/status";
import { cleanOptional, resolvePlan, normalizeAdmissionId, normalizeIndianMobile, parseCurrency, parseSheetDate } from "@/lib/utils/normalization";
import { upsertMember } from "@/repositories/member.repository";

const CONCURRENT_IMPORTS = 1;
const blank = (row: RawMembershipRow) => Object.entries(row).filter(([key]) => !["sourceSheet", "sourceRow"].includes(key)).every(([, value]) => value == null || String(value).trim() === "");
const withImportSource = (row: RawMembershipRow, index: number) => {
  const sourceSheet = cleanOptional(row.sourceSheet) ?? "Google Sheets";
  const candidate = Number(row.sourceRow);
  const sourceRow = Number.isInteger(candidate) && candidate > 0 ? candidate : index + 1;
  return { ...row, sourceSheet, sourceRow };
};

export async function runImport(adapter: MembershipSheetAdapter, initiatedBy: string) {
  const initialPin = process.env.MEMBER_INITIAL_PIN;
  if (initialPin && initialPin.length < 8) throw new Error("MEMBER_INITIAL_PIN must contain at least 8 characters");

  const initialPinHash = initialPin ? await bcrypt.hash(initialPin, 12) : null;
  const rows = await adapter.fetchMembershipRows();
  const batch = await prisma.importBatch.create({ data: { initiatedBy, status: "PROCESSING", totalRows: rows.length } });
  const counts = { successfulRows: 0, updatedRows: 0, skippedRows: 0, warningRows: 0, failedRows: 0 };

  const importRow = async (inputRow: RawMembershipRow, index: number) => {
    const row = withImportSource(inputRow, index);
    try {
      if (blank(row)) {
        counts.skippedRows++;
        return;
      }

      const admissionId = normalizeAdmissionId(row.admissionId);
      if (!admissionId) throw new Error("Admission ID is required");

      const result = await prisma.$transaction(async (transaction) => {
        const existing = await transaction.member.findUnique({ where: { admissionId } });
        const mobile = normalizeIndianMobile(row.mobile);
        const warnings: string[] = [];
        const member = await upsertMember(transaction, admissionId, {
          fullName: cleanOptional(row.name) ?? existing?.fullName ?? "Unknown member",
          mobileNumber: mobile,
          originalMobileNumber: cleanOptional(row.mobile),
          gender: cleanOptional(row.gender),
          ageAtImport: Number(row.age) || null,
          birthDate: parseSheetDate(row.birthDate),
          address: cleanOptional(row.address),
          medicalHistory: cleanOptional(row.medicalHistory),
          sourceSheet: row.sourceSheet,
          sourceRow: row.sourceRow,
        });

        if (initialPinHash && member.mobileNumber) {
          const memberUser = await transaction.user.findUnique({ where: { memberId: member.id } });
          if (memberUser?.role === "MEMBER" && memberUser.mustChangePassword) {
            await transaction.user.update({ where: { id: memberUser.id }, data: { pinHash: initialPinHash, isActive: true, failedLoginCount: 0, lockedUntil: null } });
          } else if (!memberUser) {
            const userWithMobile = await transaction.user.findUnique({ where: { mobileNumber: member.mobileNumber } });
            if (userWithMobile) warnings.push("Member login was not provisioned because this mobile number is already in use.");
            else await transaction.user.create({ data: { memberId: member.id, mobileNumber: member.mobileNumber, pinHash: initialPinHash, role: "MEMBER", mustChangePassword: true } });
          }
        }

        const found = await transaction.membership.findUnique({ where: { sourceSheet_sourceRow: { sourceSheet: row.sourceSheet, sourceRow: row.sourceRow } } });
        const startDate = parseSheetDate(row.startDate);
        const endDate = parseSheetDate(row.endDate);
        const plan = resolvePlan(row.plan, row.sourceSheet, startDate, endDate);
        if (!plan) warnings.push(`Unknown membership plan: ${cleanOptional(row.plan) ?? "blank"}`);
        const planRecord = plan?.code ? await transaction.membershipPlan.findUnique({ where: { planCode: plan.code } }) : null;
        const finalAmount = parseCurrency(row.finalAmount);
        const amountPaid = parseCurrency(row.amountPaid);
        const pendingAmount = parseCurrency(row.pendingAmount);
        const data = {
          memberId: member.id, planId: planRecord?.id ?? null, planDays: plan?.days ?? null,
          category: cleanOptional(row.category), startDate, endDate,
          totalAmount: parseCurrency(row.totalAmount), discountAmount: parseCurrency(row.discount), finalAmount, amountPaid, pendingAmount,
          paymentMode: cleanOptional(row.paymentMode), paymentStatus: calculatePaymentStatus(finalAmount, amountPaid, pendingAmount),
          sourcePaymentStatus: cleanOptional(row.paymentStatus), membershipStatus: plan ? calculateMembershipStatus(startDate, endDate) : "REVIEW_REQUIRED" as const,
          remarks: cleanOptional(row.remarks), sourceType: "LEGACY_IMPORT" as const, sourceTimestamp: parseSheetDate(row.timestamp),
        };
        await transaction.membership.upsert({ where: { sourceSheet_sourceRow: { sourceSheet: row.sourceSheet, sourceRow: row.sourceRow } }, create: { ...data, sourceSheet: row.sourceSheet, sourceRow: row.sourceRow }, update: data });
        await transaction.migrationLog.create({ data: { batchId: batch.id, sourceSheet: row.sourceSheet, sourceRow: row.sourceRow, admissionId, status: warnings.length ? "WARNING" : found ? "UPDATED" : "MIGRATED", warningMessage: warnings.join("; ") || null, rawData: row as object } });
        return { updated: !!found, warning: !!warnings.length };
      }, { maxWait: 15_000, timeout: 30_000 });

      result.updated ? counts.updatedRows++ : counts.successfulRows++;
      if (result.warning) counts.warningRows++;
    } catch (error) {
      counts.failedRows++;
      await prisma.migrationLog.create({ data: { batchId: batch.id, sourceSheet: row.sourceSheet, sourceRow: row.sourceRow, admissionId: normalizeAdmissionId(row.admissionId), status: "FAILED", errorMessage: error instanceof Error ? error.message : "Unknown error", rawData: row as object } });
    }
  };

  for (let start = 0; start < rows.length; start += CONCURRENT_IMPORTS) {
    await Promise.all(rows.slice(start, start + CONCURRENT_IMPORTS).map((row, offset) => importRow(row, start + offset)));
  }

  return prisma.importBatch.update({ where: { id: batch.id }, data: { ...counts, completedAt: new Date(), status: counts.failedRows || counts.warningRows ? "COMPLETED_WITH_WARNINGS" : "COMPLETED" }, include: { logs: true } });
}
