import { redirect } from "next/navigation";
import { MemberBottomNav } from "@/components/layout/member-bottom-nav";
import { HistoryView } from "@/components/workouts/workout-client";
import { getSession } from "@/lib/auth/session";
import { getWorkoutHistory } from "@/services/workout.service";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await getSession();
  if (!session?.memberId) redirect("/login");
  return <><HistoryView items={await getWorkoutHistory(session.userId)} /><MemberBottomNav active="workout" /></>;
}
