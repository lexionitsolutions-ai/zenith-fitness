import { redirect } from "next/navigation";
import { ZenithLogo } from "@/components/brand/zenith-logo";
import { MemberBottomNav } from "@/components/layout/member-bottom-nav";
import { GoalSelection, WorkoutDashboard } from "@/components/workouts/workout-client";
import { getSession } from "@/lib/auth/session";
import { availableGoalCards, getActiveWorkout } from "@/services/workout.service";
import { WorkoutModeToggle } from "@/components/workouts/workout-mode-toggle";
import { FunctionalComingSoon } from "@/components/workouts/functional-coming-soon";
import { RoleBottomNav } from "@/components/layout/role-bottom-nav";
import { WorkoutAdmin } from "@/components/admin/workout-admin";
import { getAdminWorkoutConsole, getWeightTrainingLibrary } from "@/services/workout.service";
import { WeightTrainingLibrary } from "@/components/workouts/weight-training-library";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const mode = (await searchParams).mode === "functional" ? "functional" : "weight";
  let content;
  if (mode === "functional") {
    content = <FunctionalComingSoon />;
  } else if (session.role === "ADMIN") {
    content = <WorkoutAdmin data={await getAdminWorkoutConsole()} />;
  } else if (session.role === "STAFF") {
    content = <WeightTrainingLibrary plans={await getWeightTrainingLibrary()} />;
  } else {
    const workout = await getActiveWorkout(session.userId);
    content = workout ? <WorkoutDashboard workout={workout} cards={availableGoalCards()} /> : <GoalSelection goals={availableGoalCards()} />;
  }
  return <>
    <div className="app-topbar border-b border-white/10"><div className="safe-x mx-auto max-w-5xl px-4 py-3 sm:px-8"><ZenithLogo compact /><div className="mt-3"><WorkoutModeToggle mode={mode} /></div></div></div>
    {content}
    {session.role === "MEMBER" ? <MemberBottomNav active="workout" /> : <RoleBottomNav role={session.role} />}
  </>;
}
