import { z } from "zod";
import { requireActiveRole } from "@/lib/auth/authorize";
import { assignTarget, completeTarget } from "@/services/points.service";
import { apiError } from "@/lib/errors";

const create = z.object({
  memberId: z.string().uuid(),
  title: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  targetValue: z.number().positive().optional(),
  unit: z.string().max(30).optional(),
  rewardPoints: z.number().int().min(1).max(10000),
  startDate: z.coerce.date(),
  dueDate: z.coerce.date(),
});
const complete = z.object({ targetId: z.string().uuid() });

export async function POST(req: Request) {
  try {
    const session = await requireActiveRole(["STAFF", "ADMIN"]);
    return Response.json({
      success: true,
      data: await assignTarget(create.parse(await req.json()), session.userId),
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const session = await requireActiveRole(["STAFF", "ADMIN"]);
    return Response.json({
      success: true,
      data: await completeTarget(complete.parse(await req.json()).targetId, session.userId),
    });
  } catch (error) {
    return apiError(error);
  }
}
