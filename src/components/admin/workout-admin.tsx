"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { getAdminWorkoutConsole } from "@/services/workout.service";

type Data = Awaited<ReturnType<typeof getAdminWorkoutConsole>>;
type Mode = "update" | "create";

const exerciseTypes = ["WARM_UP", "STRENGTH", "CARDIO", "CORE", "FINISHER", "BODYWEIGHT", "STEPPER", "DUMBBELL", "BARBELL", "CABLE", "TRX", "MACHINE", "FREE_WEIGHT"] as const;
type ExerciseTypeValue = (typeof exerciseTypes)[number];

function formatTime(seconds: number | null | undefined) {
  if (seconds == null) return "";
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function parseTime(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const parts = trimmed.split(":").map((part) => Number(part));
  if (parts.some((part) => !Number.isInteger(part) || part < 0)) return Number.NaN;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return Number.NaN;
}

function optionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const number = Number(trimmed);
  return Number.isInteger(number) ? number : Number.NaN;
}

export function WorkoutAdmin({ data }: { data: Data }) {
  const router = useRouter();
  const firstExercise = data.exercises[0];
  const firstPlan = data.plans[0];
  const firstDay = firstPlan?.days[0];
  const [mode, setMode] = useState<Mode>("update");
  const [exerciseId, setExerciseId] = useState(firstExercise?.id ?? "");
  const selectedExercise = useMemo(() => data.exercises.find((exercise) => exercise.id === exerciseId), [data.exercises, exerciseId]);
  const [newName, setNewName] = useState("");
  const [exerciseType, setExerciseType] = useState<ExerciseTypeValue>((firstExercise?.exerciseType as ExerciseTypeValue | undefined) ?? "STRENGTH");
  const [equipmentType, setEquipmentType] = useState(firstExercise?.equipmentType ?? "");
  const [stationId, setStationId] = useState(firstExercise?.stationId ?? "");
  const [videoUrl, setVideoUrl] = useState(firstExercise?.youtubeVideoId ? `https://www.youtube.com/watch?v=${firstExercise.youtubeVideoId}` : "");
  const [startTime, setStartTime] = useState(formatTime(firstExercise?.videoStartSeconds));
  const [endTime, setEndTime] = useState(formatTime(firstExercise?.videoEndSeconds));
  const [instructions, setInstructions] = useState(firstExercise?.instructions ?? "");
  const [message, setMessage] = useState("");
  const [memberUserId, setMemberUserId] = useState(data.members[0]?.id ?? "");
  const [workoutPlanId, setWorkoutPlanId] = useState(data.plans[0]?.id ?? "");
  const [fitnessGoal, setFitnessGoal] = useState("GENERAL_FITNESS");
  const [cardPlanId, setCardPlanId] = useState(firstPlan?.id ?? "");
  const [cardDayId, setCardDayId] = useState(firstDay?.id ?? "");
  const selectedPlan = useMemo(() => data.plans.find((plan) => plan.id === cardPlanId) ?? data.plans[0], [cardPlanId, data.plans]);
  const selectedDay = useMemo(() => selectedPlan?.days.find((day) => day.id === cardDayId) ?? selectedPlan?.days[0], [cardDayId, selectedPlan]);
  const [cardExerciseId, setCardExerciseId] = useState(firstExercise?.id ?? "");
  const [cardSectionName, setCardSectionName] = useState("Strength");
  const [cardSets, setCardSets] = useState("2");
  const [cardReps, setCardReps] = useState("15");
  const [cardMinReps, setCardMinReps] = useState("");
  const [cardMaxReps, setCardMaxReps] = useState("");
  const [cardHoldSeconds, setCardHoldSeconds] = useState("");
  const [cardRestSeconds, setCardRestSeconds] = useState("");
  const [cardAlternativeGroup, setCardAlternativeGroup] = useState("");
  const [cardMessage, setCardMessage] = useState("");

  function loadSelected(id: string) {
    const exercise = data.exercises.find((item) => item.id === id);
    setExerciseId(id);
    setVideoUrl(exercise?.youtubeVideoId ? `https://www.youtube.com/watch?v=${exercise.youtubeVideoId}` : "");
    setStartTime(formatTime(exercise?.videoStartSeconds));
    setEndTime(formatTime(exercise?.videoEndSeconds));
    setInstructions(exercise?.instructions ?? "");
    setEquipmentType(exercise?.equipmentType ?? "");
    setStationId(exercise?.stationId ?? "");
    setExerciseType((exercise?.exerciseType as ExerciseTypeValue | undefined) ?? "STRENGTH");
    setMessage("");
  }

  function blankExerciseForm(nextMode = mode) {
    setVideoUrl("");
    setStartTime("");
    setEndTime("");
    setInstructions("");
    setNewName("");
    setEquipmentType("");
    setStationId("");
    setExerciseType("STRENGTH");
    if (nextMode === "update") setExerciseId(data.exercises[0]?.id ?? "");
  }

  async function saveExercise() {
    setMessage("");
    const videoStartSeconds = parseTime(startTime);
    const videoEndSeconds = parseTime(endTime);
    if (Number.isNaN(videoStartSeconds) || Number.isNaN(videoEndSeconds)) return setMessage("Use time like 74 or 1:14.");
    if (videoStartSeconds != null && videoEndSeconds != null && videoEndSeconds <= videoStartSeconds) return setMessage("End time must be after start time.");
    const body =
      mode === "create"
        ? { intent: "createExercise", name: newName, exerciseType, equipmentType: equipmentType || null, stationId: stationId || null, videoUrl: videoUrl || null, videoStartSeconds, videoEndSeconds, instructions: instructions || null }
        : { exerciseId, videoUrl: videoUrl || null, videoStartSeconds, videoEndSeconds, instructions: instructions || null };
    const response = await fetch("/api/admin/workouts", { method: mode === "create" ? "POST" : "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json().catch(() => null);
    if (!response.ok) return setMessage(result?.error?.message ?? "Exercise could not be saved.");
    setMessage("Exercise saved");
    blankExerciseForm(mode);
    router.refresh();
  }

  async function assignPlan() {
    if (!window.confirm("Replace this member's active workout plan and start fresh progress?")) return;
    await fetch("/api/admin/workouts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ memberUserId, workoutPlanId, fitnessGoal, replaceActive: true }) });
    router.refresh();
  }

  async function addCardExercise() {
    setCardMessage("");
    if (!selectedDay) return setCardMessage("Select a workout day first.");
    const values = {
      sets: optionalNumber(cardSets),
      reps: optionalNumber(cardReps),
      minimumReps: optionalNumber(cardMinReps),
      maximumReps: optionalNumber(cardMaxReps),
      holdSeconds: optionalNumber(cardHoldSeconds),
      restSeconds: optionalNumber(cardRestSeconds),
    };
    if (Object.values(values).some(Number.isNaN)) return setCardMessage("Use whole numbers for sets, reps, hold, and rest.");
    const response = await fetch("/api/admin/workouts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        intent: "addWorkoutCardExercise",
        workoutPlanDayId: selectedDay.id,
        exerciseId: cardExerciseId,
        sectionName: cardSectionName,
        ...values,
        alternativeGroup: cardAlternativeGroup || null,
      }),
    });
    const result = await response.json().catch(() => null);
    if (!response.ok) return setCardMessage(result?.error?.message ?? "Could not add exercise.");
    setCardMessage("Workout card updated");
    setCardAlternativeGroup("");
    router.refresh();
  }

  async function removeCardExercise(workoutPlanExerciseId: string) {
    if (!window.confirm("Remove this exercise from the workout card? The master exercise will stay available.")) return;
    const response = await fetch("/api/admin/workouts", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ workoutPlanExerciseId }) });
    const result = await response.json().catch(() => null);
    setCardMessage(response.ok ? "Workout card updated" : result?.error?.message ?? "Could not remove exercise.");
    if (response.ok) router.refresh();
  }

  return <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-8">
    <h1 className="text-3xl font-black">Workout management</h1>
    <section className="mt-6 grid gap-4 md:grid-cols-3">{data.plans.map((plan)=><article key={plan.id} className="rounded-3xl border border-white/10 bg-white/[.04] p-5"><p className="text-xs font-bold uppercase tracking-widest text-zenith-400">{plan.level}</p><h2 className="mt-1 font-bold">{plan.name}</h2><p className="mt-2 text-sm text-white/55">{plan.totalDays} days - {plan._count.days} day records - {plan._count.assignments} assignments</p></article>)}</section>
    <section className="mt-6 grid gap-4 lg:grid-cols-2">
      <form action={saveExercise} className="rounded-3xl border border-white/10 bg-white/[.04] p-5">
        <div className="flex rounded-2xl bg-black/20 p-1 text-sm font-bold"><button type="button" onClick={()=>{setMode("update"); blankExerciseForm("update");}} className={`min-h-11 flex-1 rounded-xl ${mode==="update"?"bg-zenith-500 text-slate-950":"text-white/65"}`}>Update exercise</button><button type="button" onClick={()=>{setMode("create"); blankExerciseForm("create");}} className={`min-h-11 flex-1 rounded-xl ${mode==="create"?"bg-zenith-500 text-slate-950":"text-white/65"}`}>Add new exercise</button></div>
        <h2 className="mt-5 text-xl font-bold">Exercise video and instructions</h2>
        {mode === "update" ? <label className="mt-4 block text-sm text-white/60">Exercise<select value={exerciseId} onChange={(e)=>loadSelected(e.target.value)} className="mt-1 min-h-12 w-full rounded-2xl border border-white/10 bg-[#10201b] px-3 text-white">{data.exercises.map((exercise)=><option key={exercise.id} value={exercise.id}>{exercise.name}{exercise.youtubeVideoId ? " - has video" : ""}</option>)}</select></label> : <>
          <label className="mt-4 block text-sm text-white/60">Exercise name<input value={newName} onChange={(e)=>setNewName(e.target.value)} required className="mt-1 min-h-12 w-full rounded-2xl border border-white/10 bg-[#10201b] px-3 text-white" placeholder="Chest press variation" /></label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="block text-sm text-white/60">Exercise type<select value={exerciseType} onChange={(e)=>setExerciseType(e.target.value as ExerciseTypeValue)} className="mt-1 min-h-12 w-full rounded-2xl border border-white/10 bg-[#10201b] px-3 text-white">{exerciseTypes.map((type)=><option key={type} value={type}>{type.replace(/_/g, " ")}</option>)}</select></label><label className="block text-sm text-white/60">Station<select value={stationId} onChange={(e)=>setStationId(e.target.value)} className="mt-1 min-h-12 w-full rounded-2xl border border-white/10 bg-[#10201b] px-3 text-white"><option value="">No station</option>{data.stations.map((station)=><option key={station.id} value={station.id}>{station.displayName}</option>)}</select></label></div>
          <label className="mt-3 block text-sm text-white/60">Equipment or zone<input value={equipmentType} onChange={(e)=>setEquipmentType(e.target.value)} className="mt-1 min-h-12 w-full rounded-2xl border border-white/10 bg-[#10201b] px-3 text-white" placeholder="Dumbbell Zone" /></label>
        </>}
        {mode === "update" && selectedExercise?.youtubeVideoId && <p className="mt-2 text-xs text-white/45">Current video can be replaced by pasting another YouTube URL.</p>}
        <label className="mt-3 block text-sm text-white/60">YouTube video URL<input value={videoUrl} onChange={(e)=>setVideoUrl(e.target.value)} className="mt-1 min-h-12 w-full rounded-2xl border border-white/10 bg-[#10201b] px-3 text-white" placeholder="https://www.youtube.com/watch?v=..." /></label>
        <div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="block text-sm text-white/60">Loop start<input value={startTime} onChange={(e)=>setStartTime(e.target.value)} className="mt-1 min-h-12 w-full rounded-2xl border border-white/10 bg-[#10201b] px-3 text-white" placeholder="1:14" /></label><label className="block text-sm text-white/60">Loop end<input value={endTime} onChange={(e)=>setEndTime(e.target.value)} className="mt-1 min-h-12 w-full rounded-2xl border border-white/10 bg-[#10201b] px-3 text-white" placeholder="1:40" /></label></div>
        <label className="mt-3 block text-sm text-white/60">Instructions<textarea value={instructions} onChange={(e)=>setInstructions(e.target.value)} className="mt-1 min-h-28 w-full rounded-2xl border border-white/10 bg-[#10201b] p-3 text-white" /></label>
        <button className="mt-4 min-h-12 rounded-2xl bg-zenith-500 px-5 font-bold text-slate-950">Save exercise</button>
        {message&&<p className="mt-4 rounded-xl bg-white/10 p-3 text-sm">{message}</p>}
      </form>
      <form action={assignPlan} className="rounded-3xl border border-white/10 bg-white/[.04] p-5"><h2 className="text-xl font-bold">Assign member plan</h2><label className="mt-4 block text-sm text-white/60">Member<select value={memberUserId} onChange={(e)=>setMemberUserId(e.target.value)} className="mt-1 min-h-12 w-full rounded-2xl border border-white/10 bg-[#10201b] px-3 text-white">{data.members.map((member)=><option key={member.id} value={member.id}>{member.member?.fullName ?? member.displayName ?? member.mobileNumber}</option>)}</select></label><label className="mt-3 block text-sm text-white/60">Plan<select value={workoutPlanId} onChange={(e)=>setWorkoutPlanId(e.target.value)} className="mt-1 min-h-12 w-full rounded-2xl border border-white/10 bg-[#10201b] px-3 text-white">{data.plans.map((plan)=><option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></label><label className="mt-3 block text-sm text-white/60">Goal<select value={fitnessGoal} onChange={(e)=>setFitnessGoal(e.target.value)} className="mt-1 min-h-12 w-full rounded-2xl border border-white/10 bg-[#10201b] px-3 text-white"><option value="WEIGHT_LOSS">Weight Loss</option><option value="WEIGHT_GAIN">Weight Gain</option><option value="GENERAL_FITNESS">General Fitness</option><option value="BUILD_ENDURANCE">Build Endurance</option></select></label><button className="mt-4 min-h-12 rounded-2xl bg-zenith-500 px-5 font-bold text-slate-950">Assign plan</button></form>
    </section>
    <section className="mt-6 rounded-3xl border border-white/10 bg-white/[.04] p-5">
      <h2 className="text-xl font-bold">Edit workout cards</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2"><label className="block text-sm text-white/60">Workout card<select value={selectedPlan?.id ?? ""} onChange={(e)=>{const plan=data.plans.find((item)=>item.id===e.target.value);setCardPlanId(e.target.value);setCardDayId(plan?.days[0]?.id ?? "");}} className="mt-1 min-h-12 w-full rounded-2xl border border-white/10 bg-[#10201b] px-3 text-white">{data.plans.map((plan)=><option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></label><label className="block text-sm text-white/60">Day<select value={selectedDay?.id ?? ""} onChange={(e)=>setCardDayId(e.target.value)} className="mt-1 min-h-12 w-full rounded-2xl border border-white/10 bg-[#10201b] px-3 text-white">{selectedPlan?.days.map((day)=><option key={day.id} value={day.id}>Day {day.dayNumber}: {day.title}</option>)}</select></label></div>
      <div className="mt-4 space-y-2">{selectedDay?.exercises.length ? selectedDay.exercises.map((item)=><div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-black/20 p-3 text-sm"><div><b>{item.sortOrder}. {item.exercise.name}</b><p className="text-white/50">{item.sectionName} - {item.sets ?? 1} sets - {item.holdSeconds ? `${item.holdSeconds}s hold` : item.minimumReps ? `${item.minimumReps}-${item.maximumReps} reps` : `${item.reps ?? 15} reps`}{item.alternativeGroup ? ` - Variation: ${item.alternativeGroup}` : ""}</p></div><button type="button" onClick={()=>removeCardExercise(item.id)} className="min-h-10 rounded-xl bg-red-500/10 px-4 text-red-200">Delete</button></div>) : <p className="rounded-2xl bg-black/20 p-4 text-sm text-white/50">No exercises on this day yet.</p>}</div>
      <form action={addCardExercise} className="mt-5 rounded-2xl bg-black/20 p-4">
        <h3 className="font-bold">Add exercise or variation</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-2"><label className="block text-sm text-white/60">Exercise<select value={cardExerciseId} onChange={(e)=>setCardExerciseId(e.target.value)} className="mt-1 min-h-12 w-full rounded-2xl border border-white/10 bg-[#10201b] px-3 text-white">{data.exercises.map((exercise)=><option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}</select></label><label className="block text-sm text-white/60">Section<input value={cardSectionName} onChange={(e)=>setCardSectionName(e.target.value)} className="mt-1 min-h-12 w-full rounded-2xl border border-white/10 bg-[#10201b] px-3 text-white" placeholder="Strength" /></label></div>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-6"><label className="block text-sm text-white/60">Sets<input value={cardSets} onChange={(e)=>setCardSets(e.target.value)} inputMode="numeric" className="mt-1 min-h-12 w-full rounded-2xl border border-white/10 bg-[#10201b] px-3 text-white" /></label><label className="block text-sm text-white/60">Reps<input value={cardReps} onChange={(e)=>setCardReps(e.target.value)} inputMode="numeric" className="mt-1 min-h-12 w-full rounded-2xl border border-white/10 bg-[#10201b] px-3 text-white" /></label><label className="block text-sm text-white/60">Min reps<input value={cardMinReps} onChange={(e)=>setCardMinReps(e.target.value)} inputMode="numeric" className="mt-1 min-h-12 w-full rounded-2xl border border-white/10 bg-[#10201b] px-3 text-white" /></label><label className="block text-sm text-white/60">Max reps<input value={cardMaxReps} onChange={(e)=>setCardMaxReps(e.target.value)} inputMode="numeric" className="mt-1 min-h-12 w-full rounded-2xl border border-white/10 bg-[#10201b] px-3 text-white" /></label><label className="block text-sm text-white/60">Hold sec<input value={cardHoldSeconds} onChange={(e)=>setCardHoldSeconds(e.target.value)} inputMode="numeric" className="mt-1 min-h-12 w-full rounded-2xl border border-white/10 bg-[#10201b] px-3 text-white" /></label><label className="block text-sm text-white/60">Rest sec<input value={cardRestSeconds} onChange={(e)=>setCardRestSeconds(e.target.value)} inputMode="numeric" className="mt-1 min-h-12 w-full rounded-2xl border border-white/10 bg-[#10201b] px-3 text-white" /></label></div>
        <label className="mt-3 block text-sm text-white/60">Variation group<input value={cardAlternativeGroup} onChange={(e)=>setCardAlternativeGroup(e.target.value)} className="mt-1 min-h-12 w-full rounded-2xl border border-white/10 bg-[#10201b] px-3 text-white" placeholder="Chest press variation A" /></label>
        <button className="mt-4 min-h-12 rounded-2xl bg-zenith-500 px-5 font-bold text-slate-950">Add to card</button>
        {cardMessage&&<p className="mt-4 rounded-xl bg-white/10 p-3 text-sm">{cardMessage}</p>}
      </form>
    </section>
    <section className="mt-6 rounded-3xl border border-white/10 bg-white/[.04] p-5"><h2 className="text-xl font-bold">Temporary station mappings</h2><div className="mt-4 grid gap-2 md:grid-cols-2">{data.stations.map((station)=><div key={station.id} className="rounded-2xl bg-white/5 p-3 text-sm"><b>{station.displayName}</b><p className="text-white/55">{station.machineName ?? "Machine pending"} - {station.location ?? "Zenith floor"}</p></div>)}</div></section>
  </main>;
}
