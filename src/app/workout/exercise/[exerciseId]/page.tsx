import { redirect } from "next/navigation";
import { ExerciseView } from "@/components/workouts/workout-client";
import { getSession } from "@/lib/auth/session";
import { getActiveWorkout } from "@/services/workout.service";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ exerciseId: string }> }) {
  const session = await getSession();
  if (!session?.memberId) redirect("/login");
  const workout = await getActiveWorkout(session.userId);
  if (!workout) redirect("/workout");
  return <ExerciseView workout={workout} exerciseId={(await params).exerciseId} />;
}
