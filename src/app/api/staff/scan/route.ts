import { z } from "zod";
import { requireActiveRole } from "@/lib/auth/authorize";
import { awardDailyVisit } from "@/services/points.service";
import { apiError } from "@/lib/errors";

const schema = z.object({ qrToken: z.string().uuid() });

export async function POST(req: Request) {
  try {
    const session = await requireActiveRole(["STAFF", "ADMIN"]);
    const { qrToken } = schema.parse(await req.json());
    return Response.json({ success: true, data: await awardDailyVisit(qrToken, session.userId) });
  } catch (error) {
    return apiError(error);
  }
}
