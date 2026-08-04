import { redirect } from "next/navigation";
import { MemberBottomNav } from "@/components/layout/member-bottom-nav";
import { WorkoutDayView } from "@/components/workouts/workout-client";
import { getSession } from "@/lib/auth/session";
import { getWorkoutDay } from "@/services/workout.service";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ dayNumber: string }> }) {
  const session = await getSession();
  if (!session?.memberId) redirect("/login");
  const dayNumber = Number((await params).dayNumber);
  const data = await getWorkoutDay(session.userId, dayNumber);
  return <><WorkoutDayView day={data.day} /><MemberBottomNav active="workout" /></>;
}
