import { redirect } from "next/navigation";
import { ZenithLogo } from "@/components/brand/zenith-logo";
import { MemberBottomNav } from "@/components/layout/member-bottom-nav";
import { GoalSelection, WorkoutDashboard } from "@/components/workouts/workout-client";
import { getSession } from "@/lib/auth/session";
import { availableGoalCards, getActiveWorkout } from "@/services/workout.service";

export const dynamic = "force-dynamic";

export default async function Page() {
  const session = await getSession();
  if (!session?.memberId) redirect("/login");
  const workout = await getActiveWorkout(session.userId);
  return <>
    <div className="app-topbar border-b border-white/10"><div className="safe-x mx-auto flex max-w-5xl items-center px-4 py-3 sm:px-8"><ZenithLogo compact /></div></div>
    {workout ? <WorkoutDashboard workout={workout} cards={availableGoalCards()} /> : <GoalSelection goals={availableGoalCards()} />}
    <MemberBottomNav active="workout" />
  </>;
}
