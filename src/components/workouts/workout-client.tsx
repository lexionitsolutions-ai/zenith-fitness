"use client";

import { ArrowLeft, CheckCircle2, Dumbbell, Flame, History, Play, ShieldCheck, Target, Trophy, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ExerciseVideo } from "@/components/workouts/exercise-video";
import type { availableGoalCards, getActiveWorkout, getWorkoutDay } from "@/services/workout.service";

type GoalCard = ReturnType<typeof availableGoalCards>[number];
type Workout = NonNullable<Awaited<ReturnType<typeof getActiveWorkout>>>;
type Day = Awaited<ReturnType<typeof getWorkoutDay>>["day"];

const goalLabel = (goal: string) =>
  goal
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());

const icons = [Target, Dumbbell, ShieldCheck, Zap, Flame, Trophy];

function WorkoutCard({
  card,
  index,
  active,
  busy,
  onChoose,
}: {
  card: GoalCard;
  index: number;
  active?: boolean;
  busy?: boolean;
  onChoose: () => void;
}) {
  const Icon = icons[index] ?? Target;
  return (
    <article className={`rounded-3xl border p-5 ${active ? "border-zenith-400 bg-zenith-500/10" : "border-white/10 bg-white/[.04]"}`}>
      <div className="flex items-start justify-between gap-4">
        <span className="rounded-2xl bg-white/10 p-3 text-zenith-400">
          <Icon />
        </span>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/70">{card.level}</span>
      </div>
      <h3 className="mt-4 text-xl font-black">{card.name}</h3>
      <p className="mt-2 text-sm text-white/60">{card.explanation}</p>
      <p className="mt-4 text-sm text-white/50">
        {card.days} days - {card.style}
      </p>
      <button
        disabled={busy || active}
        onClick={onChoose}
        className="mt-5 min-h-11 w-full rounded-2xl bg-white px-4 font-bold text-slate-950 disabled:cursor-not-allowed disabled:opacity-45"
      >
        {active ? "Selected Today" : "Follow This Card"}
      </button>
    </article>
  );
}

export function GoalSelection({ goals }: { goals: GoalCard[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function select(fitnessGoal: string, workoutPlanSlug: string) {
    setBusy(workoutPlanSlug);
    const response = await fetch("/api/member/workout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fitnessGoal, workoutPlanSlug }),
    });
    setBusy(null);
    if (response.ok) router.refresh();
  }

  return (
    <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 sm:px-8">
      <p className="text-sm font-semibold uppercase tracking-widest text-zenith-400">Workout cards</p>
      <h1 className="mt-2 text-3xl font-black">Choose your workout card</h1>
      <section className="mt-6 grid gap-4 md:grid-cols-2">
        {goals.map((goal, index) => (
          <WorkoutCard
            key={goal.planSlug}
            card={goal}
            index={index}
            busy={busy === goal.planSlug}
            onChoose={() => select(goal.goal, goal.planSlug)}
          />
        ))}
      </section>
    </main>
  );
}

export function WorkoutDashboard({ workout, cards }: { workout: Workout; cards: GoalCard[] }) {
  const summary = workout.summary;
  const [changing, setChanging] = useState(false);
  const router = useRouter();

  async function changePlan(card: GoalCard) {
    setChanging(true);
    const response = await fetch("/api/member/workout", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fitnessGoal: card.goal, workoutPlanSlug: card.planSlug }),
    });
    setChanging(false);
    if (response.ok) router.refresh();
  }

  return (
    <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 sm:px-8">
      <header className="rounded-3xl bg-gradient-to-br from-[#10201b] to-[#20352f] p-6 shadow-glow">
        <p className="text-sm uppercase tracking-widest text-zenith-400">{goalLabel(summary.fitnessGoal)}</p>
        <h1 className="mt-2 text-3xl font-black">{summary.planName}</h1>
        <div className="mt-5 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
          {[
            [`${summary.weeklyPercent}%`, "Weekly"],
            [`${summary.completedDays}/${summary.totalDays}`, "Days"],
            [`${summary.completedExercises}/${summary.totalExercises}`, "Exercises"],
            [`${summary.streak}`, "Streak"],
          ].map(([value, label]) => (
            <div key={label} className="rounded-2xl bg-white/10 p-3">
              <b className="text-2xl">{value}</b>
              <p className="text-white/55">{label}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-zenith-500 px-5 font-bold text-slate-950" href={`/workout/day/${summary.continueDay}`}>
            <Play size={18} />
            Continue Workout
          </Link>
          <Link className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-white/10 px-5" href="/workout/history">
            <History size={18} />
            History
          </Link>
        </div>
      </header>

      <section className="mt-6">
        <p className="text-sm font-semibold uppercase tracking-widest text-zenith-400">Available cards</p>
        <h2 className="mt-1 text-2xl font-black">Choose today's workout card</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {cards.map((card, index) => {
            const active = card.name === summary.planName || summary.planName.includes(card.name);
            return <WorkoutCard key={card.planSlug} card={card} index={index} active={active} busy={changing} onChoose={() => changePlan(card)} />;
          })}
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-2">
        {workout.days.map((day) => (
          <article key={day.id} className="rounded-3xl border border-white/10 bg-white/[.04] p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-zenith-400">Day {day.dayNumber}</p>
                <h2 className="mt-1 text-xl font-black">{day.title}</h2>
                <p className="mt-1 text-sm text-white/50">{day.muscleGroups.join(" + ")}</p>
              </div>
              {day.completed && <CheckCircle2 className="text-zenith-400" />}
            </div>
            <p className="mt-4 text-sm">
              {day.totalCount} Exercises - Estimated Time: {day.estimatedMinutes ?? 45} Minutes
            </p>
            <div className="mt-4 h-2 rounded-full bg-white/10">
              <div className="h-2 rounded-full bg-zenith-400" style={{ width: `${day.progressPercent}%` }} />
            </div>
            <p className="mt-2 text-sm text-white/55">
              Progress: {day.completedCount} of {day.totalCount} Completed
            </p>
            <Link href={`/workout/day/${day.dayNumber}`} className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-white px-4 font-bold text-slate-950">
              {day.completed ? "Review Workout" : day.completedCount ? "Continue Workout" : "Start Workout"}
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}

export function WorkoutDayView({ day }: { day: Day }) {
  return (
    <main className="mx-auto max-w-4xl px-4 pb-28 pt-6 sm:px-8">
      <Link href="/workout" className="inline-flex items-center gap-2 text-sm text-white/60">
        <ArrowLeft size={16} />
        Workout
      </Link>
      <h1 className="mt-4 text-3xl font-black">
        Day {day.dayNumber}: {day.title}
      </h1>
      <p className="mt-2 text-white/55">
        {day.completedCount} of {day.totalCount} completed
      </p>
      <section className="mt-6 space-y-3">
        {day.exercises.map((item) => (
          <article key={item.id} className="rounded-3xl border border-white/10 bg-white/[.04] p-4">
            <div className="flex gap-4">
              <div className="flex h-20 w-28 shrink-0 items-center justify-center rounded-2xl bg-black/30 text-white/40">
                <Play />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-zenith-400">{item.sectionName}</p>
                  <span className="rounded-full bg-zenith-500 px-3 py-1 text-xs font-black text-slate-950">{item.exercise.stationDisplay}</span>
                </div>
                <h2 className="mt-2 font-bold">{item.exercise.name}</h2>
                <p className="text-sm text-white/55">
                  {item.sets ?? 1} sets - {item.holdSeconds ? `${item.holdSeconds}s hold` : item.minimumReps ? `${item.minimumReps}-${item.maximumReps} reps` : `${item.reps ?? 15} reps`}
                </p>
              </div>
              {item.completed && <CheckCircle2 className="shrink-0 text-zenith-400" />}
            </div>
            <Link href={`/workout/exercise/${item.id}`} className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-white px-4 font-bold text-slate-950">
              Start Exercise
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}

export function ExerciseView({ workout, exerciseId }: { workout: Workout; exerciseId: string }) {
  const router = useRouter();
  const all = workout.days.flatMap((day) => day.exercises.map((exercise) => ({ ...exercise, dayNumber: day.dayNumber })));
  const index = Math.max(0, all.findIndex((item) => item.id === exerciseId));
  const item = all[index] ?? all[0];
  const prev = all[index - 1];
  const next = all[index + 1];

  async function mark(completed: boolean) {
    await fetch("/api/member/workout/progress", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workoutPlanExerciseId: item.id, completed }),
    });
    if (completed) router.replace(next ? `/workout/exercise/${next.id}` : `/workout/day/${item.dayNumber}`);
    router.refresh();
  }

  if (!item) return null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col px-2 pb-[5.25rem] pt-3 sm:px-5">
      <Link href={`/workout/day/${item.dayNumber}`} className="inline-flex items-center gap-2 px-1 text-sm text-white/60">
        <ArrowLeft size={16} />
        Day {item.dayNumber}
      </Link>
      <section className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[.04]">
        <ExerciseVideo exerciseName={item.exercise.name} youtubeVideoId={item.exercise.youtubeVideoId} videoStartSeconds={item.exercise.videoStartSeconds} videoEndSeconds={item.exercise.videoEndSeconds} status={item.exercise.videoStatus} />
        <div className="min-h-0 flex-1 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-bold uppercase tracking-widest text-zenith-400">{item.sectionName}</p>
            <span className="rounded-full bg-zenith-500 px-3 py-1 text-xs font-black text-slate-950">{item.exercise.stationDisplay}</span>
          </div>
          <h1 className="mt-2 text-[clamp(1.55rem,8vw,2rem)] font-black leading-tight">{item.exercise.name}</h1>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-white/45">Sets</dt>
              <dd className="font-bold">{item.sets ?? 1}</dd>
            </div>
            <div>
              <dt className="text-white/45">Reps</dt>
              <dd className="font-bold">{item.holdSeconds ? `${item.holdSeconds}s hold` : item.minimumReps ? `${item.minimumReps}-${item.maximumReps}` : item.reps}</dd>
            </div>
            <div className="col-span-2 rounded-2xl bg-zenith-500/15 p-3">
              <dt className="text-zenith-300">Station</dt>
              <dd className="text-xl font-black leading-tight text-zenith-400">{item.exercise.stationDisplay}</dd>
            </div>
          </dl>
          <p className="mt-3 line-clamp-3 text-sm leading-snug text-white/65">{item.exercise.instructions}</p>
        </div>
      </section>
      <nav className="fixed bottom-2 left-1/2 z-30 grid w-[calc(100%-16px)] max-w-md -translate-x-1/2 grid-cols-3 gap-2 rounded-2xl border border-white/10 bg-[#10201b]/95 p-2 pb-[calc(.5rem+env(safe-area-inset-bottom))] shadow-2xl backdrop-blur">
        <Link aria-disabled={!prev} href={prev ? `/workout/exercise/${prev.id}` : "#"} className="flex min-h-12 items-center justify-center rounded-xl bg-white/5 text-sm">
          Previous
        </Link>
        <button onClick={() => mark(!item.completed)} className="min-h-12 rounded-xl bg-zenith-500 px-1 text-sm font-bold leading-tight text-slate-950">
          {item.completed ? "Undo" : "Mark Complete"}
        </button>
        <Link aria-disabled={!next} href={next ? `/workout/exercise/${next.id}` : `/workout/day/${item.dayNumber}`} className="flex min-h-12 items-center justify-center rounded-xl bg-white/5 text-sm">
          Next
        </Link>
      </nav>
    </main>
  );
}

export function HistoryView({ items }: { items: Awaited<ReturnType<typeof import("@/services/workout.service").getWorkoutHistory>> }) {
  return (
    <main className="mx-auto max-w-3xl px-4 pb-28 pt-6 sm:px-8">
      <Link href="/workout" className="inline-flex items-center gap-2 text-sm text-white/60">
        <ArrowLeft size={16} />
        Workout
      </Link>
      <h1 className="mt-4 text-3xl font-black">Workout history</h1>
      <section className="mt-6 space-y-3">
        {items.map((item) => (
          <article key={item.id} className="rounded-3xl border border-white/10 bg-white/[.04] p-5">
            <div className="flex items-center gap-3">
              <Trophy className="text-zenith-400" />
              <div>
                <h2 className="font-bold">{item.workoutPlan.name}</h2>
                <p className="text-sm text-white/55">
                  {goalLabel(item.fitnessGoal)} - {item.status} - {item._count.progress} updates
                </p>
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
