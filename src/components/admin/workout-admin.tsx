"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { getAdminWorkoutConsole } from "@/services/workout.service";

type Data = Awaited<ReturnType<typeof getAdminWorkoutConsole>>;

export function WorkoutAdmin({ data }: { data: Data }) {
  const router = useRouter();
  const [exerciseId, setExerciseId] = useState(data.exercises[0]?.id ?? "");
  const [videoUrl, setVideoUrl] = useState("");
  const [instructions, setInstructions] = useState("");
  const [memberUserId, setMemberUserId] = useState(data.members[0]?.id ?? "");
  const [workoutPlanId, setWorkoutPlanId] = useState(data.plans[0]?.id ?? "");
  const [fitnessGoal, setFitnessGoal] = useState("GENERAL_FITNESS");
  async function saveExercise() {
    await fetch("/api/admin/workouts", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ exerciseId, videoUrl: videoUrl || null, instructions: instructions || null }) });
    router.refresh();
  }
  async function assignPlan() {
    if (!window.confirm("Replace this member's active workout plan and start fresh progress?")) return;
    await fetch("/api/admin/workouts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ memberUserId, workoutPlanId, fitnessGoal, replaceActive: true }) });
    router.refresh();
  }
  return <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-8">
    <h1 className="text-3xl font-black">Workout management</h1>
    <section className="mt-6 grid gap-4 md:grid-cols-3">{data.plans.map((plan)=><article key={plan.id} className="rounded-3xl border border-white/10 bg-white/[.04] p-5"><p className="text-xs font-bold uppercase tracking-widest text-zenith-400">{plan.level}</p><h2 className="mt-1 font-bold">{plan.name}</h2><p className="mt-2 text-sm text-white/55">{plan.totalDays} days · {plan._count.days} day records · {plan._count.assignments} assignments</p></article>)}</section>
    <section className="mt-6 grid gap-4 lg:grid-cols-2">
      <form action={saveExercise} className="rounded-3xl border border-white/10 bg-white/[.04] p-5"><h2 className="text-xl font-bold">Exercise video and instructions</h2><label className="mt-4 block text-sm text-white/60">Exercise<select value={exerciseId} onChange={(e)=>setExerciseId(e.target.value)} className="mt-1 min-h-12 w-full rounded-2xl border border-white/10 bg-[#10201b] px-3 text-white">{data.exercises.map((exercise)=><option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}</select></label><label className="mt-3 block text-sm text-white/60">Video URL<input value={videoUrl} onChange={(e)=>setVideoUrl(e.target.value)} className="mt-1 min-h-12 w-full rounded-2xl border border-white/10 bg-[#10201b] px-3 text-white" placeholder="YouTube embed or local URL" /></label><label className="mt-3 block text-sm text-white/60">Instructions<textarea value={instructions} onChange={(e)=>setInstructions(e.target.value)} className="mt-1 min-h-28 w-full rounded-2xl border border-white/10 bg-[#10201b] p-3 text-white" /></label><button className="mt-4 min-h-12 rounded-2xl bg-zenith-500 px-5 font-bold text-slate-950">Save exercise</button></form>
      <form action={assignPlan} className="rounded-3xl border border-white/10 bg-white/[.04] p-5"><h2 className="text-xl font-bold">Assign member plan</h2><label className="mt-4 block text-sm text-white/60">Member<select value={memberUserId} onChange={(e)=>setMemberUserId(e.target.value)} className="mt-1 min-h-12 w-full rounded-2xl border border-white/10 bg-[#10201b] px-3 text-white">{data.members.map((member)=><option key={member.id} value={member.id}>{member.member?.fullName ?? member.displayName ?? member.mobileNumber}</option>)}</select></label><label className="mt-3 block text-sm text-white/60">Plan<select value={workoutPlanId} onChange={(e)=>setWorkoutPlanId(e.target.value)} className="mt-1 min-h-12 w-full rounded-2xl border border-white/10 bg-[#10201b] px-3 text-white">{data.plans.map((plan)=><option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></label><label className="mt-3 block text-sm text-white/60">Goal<select value={fitnessGoal} onChange={(e)=>setFitnessGoal(e.target.value)} className="mt-1 min-h-12 w-full rounded-2xl border border-white/10 bg-[#10201b] px-3 text-white"><option value="WEIGHT_LOSS">Weight Loss</option><option value="WEIGHT_GAIN">Weight Gain</option><option value="GENERAL_FITNESS">General Fitness</option><option value="BUILD_ENDURANCE">Build Endurance</option></select></label><button className="mt-4 min-h-12 rounded-2xl bg-zenith-500 px-5 font-bold text-slate-950">Assign plan</button></form>
    </section>
    <section className="mt-6 rounded-3xl border border-white/10 bg-white/[.04] p-5"><h2 className="text-xl font-bold">Temporary station mappings</h2><div className="mt-4 grid gap-2 md:grid-cols-2">{data.stations.map((station)=><div key={station.id} className="rounded-2xl bg-white/5 p-3 text-sm"><b>{station.displayName}</b><p className="text-white/55">{station.machineName ?? "Machine pending"} · {station.location ?? "Zenith floor"}</p></div>)}</div></section>
  </main>;
}
