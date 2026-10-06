import { prisma } from "@/lib/database/prisma";
import { enquiryInput } from "@/lib/visitor";
import { apiError, AppError } from "@/lib/errors";
import { sheetText } from "@/lib/sheets/reception";
import { syncSheetsJob } from "@/services/sheets-sync.service";
export const maxDuration = 60;
export async function POST(req: Request) {
  try {
    const parsed = enquiryInput.safeParse(await req.json());
    if (!parsed.success) throw new AppError("INVALID_INPUT", parsed.error.issues[0].message);
    const v = parsed.data;
    const recent = await prisma.trialEnquiry.count({ where: { contact: v.contact, createdAt: { gte: new Date(Date.now() - 86400000) } } });
    if (recent >= 3) throw new AppError("TOO_MANY_REQUESTS", "Your enquiry is already with the gym. Please wait for our team to contact you.", 429);
    const job = await prisma.$transaction(async tx => {
      const enquiry = await tx.trialEnquiry.create({ data: { ...v, trialDate: new Date(`${v.trialDate}T00:00:00Z`) } });
      return tx.sheetsSyncJob.create({ data: { key: `ENQUIRY:${enquiry.id}`, kind: "ENQUIRY", payload: { action: "enquire", name: sheetText(v.name), contact: v.contact.replace(/\D/g, "").slice(-10), followUpDate: v.trialDate, source: "Zenith Fitness App", interestedIn: "Free one-day gym trial", message: `Requested trial: ${v.trialDate}; enquiry ${enquiry.id}` } } });
    });
    const sheetsStatus = await syncSheetsJob(job.id);
    return Response.json({ success: true, sheetsStatus, message: "Thank you for enquiring at Zenith Fitness! Our team will contact you to confirm your free one-day trial. For enquiries, call 9272112745." });
  } catch (e) { return apiError(e); }
}
