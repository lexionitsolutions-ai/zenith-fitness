import { Role } from "@prisma/client";
import { WorkoutAdmin } from "@/components/admin/workout-admin";
import { requireActiveRole } from "@/lib/auth/authorize";
import { getAdminWorkoutConsole } from "@/services/workout.service";

export const dynamic = "force-dynamic";

export default async function Page() {
  await requireActiveRole([Role.ADMIN]);
  return <WorkoutAdmin data={await getAdminWorkoutConsole()} />;
}
