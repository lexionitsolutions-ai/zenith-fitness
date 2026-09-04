import { z } from "zod";
import { requireActiveRole } from "@/lib/auth/authorize";
import { awardDailyVisit, findMemberForDailyVisit } from "@/services/points.service";
import { apiError } from "@/lib/errors";

const schema = z.object({ qrToken: z.string().min(1) });

export async function GET(req: Request) {
  try {
    await requireActiveRole(["STAFF", "ADMIN"]);
    const qrToken = schema.parse({ qrToken: new URL(req.url).searchParams.get("qrToken") }).qrToken;
    const member = await findMemberForDailyVisit(qrToken);
    return Response.json({ success: true, data: member });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireActiveRole(["STAFF", "ADMIN"]);
    const { qrToken } = schema.parse(await req.json());
    const member = await findMemberForDailyVisit(qrToken);
    return Response.json({ success: true, data: await awardDailyVisit(member.qrToken, session.userId) });
  } catch (error) {
    return apiError(error);
  }
}
