import { prisma } from "@/lib/database/prisma";
import { findReceptionRow, postReception, type ReceptionPayload, type SheetReceipt } from "@/lib/sheets/reception";

async function complete(id: string, payload: ReceptionPayload, receipt: SheetReceipt | null) {
  await prisma.$transaction(async tx => {
    if (receipt && payload.localMemberId && payload.localMembershipId) {
      if (payload.action === "admission") await tx.member.update({ where: { id: payload.localMemberId }, data: { admissionId: receipt.admissionId } });
      await tx.membership.update({ where: { id: payload.localMembershipId }, data: { sourceSheet: receipt.sourceSheet, sourceRow: receipt.sourceRow } });
    }
    await tx.sheetsSyncJob.update({ where: { id }, data: { status: "SYNCED", lastError: null, result: receipt ?? { confirmed: true } } });
  });
  return "SYNCED";
}

export async function syncSheetsJob(id: string, confirmedMissing = false): Promise<string> {
  const job = await prisma.sheetsSyncJob.findUniqueOrThrow({ where: { id } });
  if (job.status === "SYNCED") return job.status;
  if (job.status === "PROCESSING") {
    if (job.updatedAt.valueOf() < Date.now() - 120000) {
      await prisma.sheetsSyncJob.updateMany({ where: { id, status: "PROCESSING", updatedAt: job.updatedAt }, data: { status: "UNCERTAIN", lastError: "Processing was interrupted. Check Sheets before retrying." } });
      return "UNCERTAIN";
    }
    return job.status;
  }
  const claim = await prisma.sheetsSyncJob.updateMany({ where: { id, status: job.status }, data: { status: "PROCESSING", attempts: { increment: 1 }, lastError: null } });
  if (!claim.count) return "PROCESSING";
  const payload = job.payload as ReceptionPayload;
  let writeStarted = false;
  let writeConfirmed = job.status === "SAVED";
  try {
    if (writeConfirmed && job.kind === "ENQUIRY") return await complete(id, payload, null);
    if (job.kind !== "ENQUIRY") {
      const receipt = await findReceptionRow(payload);
      if (receipt) return await complete(id, payload, receipt);
    }
    // A confirmed write is only reconciled, never posted a second time.
    if (writeConfirmed) throw new Error("Sheets confirmed saving, but the exported row is not available yet. Retry reconciliation or check the reception deployment.");
    if (job.status === "UNCERTAIN" && !confirmedMissing) throw new Error("No confirmed row was found. Check the sheet and explicitly confirm it is missing before resending.");
    writeStarted = true;
    const response = await postReception(payload, job.kind);
    writeConfirmed = true;
    // Persist the receipt before reconciliation so a crash cannot resend a saved row.
    await prisma.sheetsSyncJob.update({ where: { id }, data: { status: "SAVED", result: response } });
    if (job.kind === "ENQUIRY") return await complete(id, payload, null);
    const receipt = await findReceptionRow(payload);
    if (!receipt) throw new Error("Saved in Sheets; waiting to reconcile the exported row and admission ID.");
    return await complete(id, payload, receipt);
  } catch (e) {
    const status = writeConfirmed ? "SAVED" : writeStarted || job.status === "UNCERTAIN" ? "UNCERTAIN" : "FAILED";
    await prisma.sheetsSyncJob.updateMany({ where: { id, status: { not: "SYNCED" } }, data: { status, lastError: e instanceof Error ? e.message.slice(0, 250) : "Sheet synchronization failed." } });
    return status;
  }
}
