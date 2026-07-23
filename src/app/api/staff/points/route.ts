import { z } from "zod";
import { requireActiveRole } from "@/lib/auth/authorize";
import { reduceMemberPoints } from "@/services/points.service";
import { apiError } from "@/lib/errors";

const schema = z.object({
  memberId: z.string().uuid(),
  action: z.enum(["REDUCE", "RESET"]),
  amount: z.number().int().positive().optional(),
  reason: z.string().trim().min(3).max(200),
}).refine((value) => value.action === "RESET" || value.amount !== undefined, {
  message: "Reduction amount is required",
});

export async function POST(req: Request) {
  try {
    const session = await requireActiveRole(["STAFF", "ADMIN"]);
    const value = schema.parse(await req.json());
    return Response.json({
      success: true,
      data: await reduceMemberPoints(value.memberId, session.userId, value.action, value.amount, value.reason),
    });
  } catch (error) {
    return apiError(error);
  }
}
