"use client";

import { ArrowLeft, CheckCircle2, Dumbbell, Scale, Trophy } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import type { ReactNode } from "react";

type Snapshot = Awaited<ReturnType<typeof import("@/services/fitness-target.service").getFitnessTarget>>;
type GoalType = "WEIGHT_LOSS" | "MUSCLE_GAIN";

const today = new Date().toISOString().slice(0, 10);
const emptyBmi = { assessmentDate: today, weightKg: "", skeletalMuscleMassKg: "", fatMassKg: "", bodyFatPercentage: "" };
const label = (goal: GoalType) => (goal === "WEIGHT_LOSS" ? "Weight Loss" : "Muscle Gain");

export function SetTargetClient({ initialData }: { initialData: Snapshot }) {
  const router = useRouter();
  const search = useSearchParams();
  const updateMode = search.get("mode") === "update";
  const [hasReport, setHasReport] = useState<null | boolean>(updateMode ? true : null);
  const [bmi, setBmi] = useState(emptyBmi);
  const [goalType, setGoalType] = useState<GoalType>("WEIGHT_LOSS");
  const [targetValue, setTargetValue] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [targetEndDate, setTargetEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<Snapshot & { rewardAwarded?: boolean }>();
  const activeTarget = initialData.target;

  const goalCurrent = useMemo(() => goalType === "WEIGHT_LOSS" ? Number(bmi.weightKg) : Number(bmi.skeletalMuscleMassKg), [bmi, goalType]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const body = updateMode
      ? bmi
      : { bmi, goalType, targetWeightKg: goalType === "WEIGHT_LOSS" ? targetValue : undefined, targetMuscleMassKg: goalType === "MUSCLE_GAIN" ? targetValue : undefined, startDate, targetEndDate };
    const response = await fetch(updateMode ? "/api/member/fitness-target/bmi-assessment" : "/api/member/fitness-target", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await response.json();
    setSubmitting(false);
    if (!response.ok || !json.success) {
      setError(json.error?.message ?? "Something went wrong. Please try again.");
      return;
    }
    setSuccess(json.data);
    router.refresh();
  }

  if (success?.target) {
    return (
      <Shell>
        <section className="mt-8 rounded-3xl border border-zenith-400/30 bg-zenith-500/[.10] p-6 text-center">
          <CheckCircle2 className="mx-auto text-zenith-300" size={52} />
          <h1 className="mt-4 text-3xl font-black">{updateMode ? "BMI Updated!" : "Target Set!"}</h1>
          <p className="mt-2 text-white/60">Great start! Your fitness journey is now being tracked.</p>
          {success.rewardAwarded && <p className="mt-5 text-lg font-black text-amber-200">+50 Points Earned</p>}
          <p className="mt-4 text-sm text-white/55">Next BMI Check: <b className="text-white">{new Date(`${success.target.nextBmiDate}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</b></p>
          <Link href="/my-progress" className="mt-7 inline-flex min-h-12 items-center rounded-2xl bg-white px-6 font-bold text-black">View My Progress</Link>
        </section>
      </Shell>
    );
  }

  if (hasReport === false) {
    return (
      <Shell>
        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[.04] p-6">
          <h1 className="text-3xl font-black">Get Your BMI Test Done</h1>
          <p className="mt-3 text-white/60">Complete your BMI assessment at Zenith Fitness to accurately set and track your fitness goal.</p>
          <div className="mt-6 rounded-2xl bg-black/25 p-4 text-sm text-white/70"><b className="text-white">Next Step</b><p className="mt-2">Get your BMI test {"->"} Return to the app {"->"} Enter your report {"->"} Set your target</p></div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/dashboard" className="inline-flex min-h-11 items-center rounded-2xl border border-white/10 px-5 font-bold">I'll Do It Later</Link>
            <button onClick={() => setHasReport(true)} className="min-h-11 rounded-2xl bg-zenith-400 px-5 font-bold text-black">Got My BMI Report</button>
          </div>
        </section>
      </Shell>
    );
  }

  if (hasReport === null) {
    return (
      <Shell>
        <section className="mt-8 rounded-3xl border border-white/10 bg-white/[.04] p-6">
          <h1 className="text-3xl font-black">Got your BMI Test Done?</h1>
          <p className="mt-3 text-white/60">Your BMI report will be used as the starting point for tracking your progress.</p>
          <div className="mt-7 grid gap-3">
            <button onClick={() => setHasReport(true)} className="min-h-12 rounded-2xl bg-zenith-400 px-5 font-bold text-black">Yes, I Have My BMI Report</button>
            <button onClick={() => setHasReport(false)} className="min-h-12 rounded-2xl border border-white/10 px-5 font-bold">No, Not Yet</button>
          </div>
        </section>
      </Shell>
    );
  }

  return (
    <Shell>
      <form onSubmit={submit} className="mt-8 space-y-6">
        <section className="rounded-3xl border border-white/10 bg-white/[.04] p-5">
          <h1 className="text-2xl font-black">{updateMode ? "Update Your BMI Progress" : "Your Current BMI Report"}</h1>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Input label="BMI Test Date" type="date" value={bmi.assessmentDate} max={today} onChange={(v) => { setBmi({ ...bmi, assessmentDate: v }); if (!updateMode) setStartDate(v); }} />
            <Input label="Current Weight (kg)" value={bmi.weightKg} onChange={(v) => setBmi({ ...bmi, weightKg: v })} />
            <Input label="Skeletal Muscle Mass (kg)" value={bmi.skeletalMuscleMassKg} onChange={(v) => setBmi({ ...bmi, skeletalMuscleMassKg: v })} />
            <Input label="Fat Mass (kg)" value={bmi.fatMassKg} onChange={(v) => setBmi({ ...bmi, fatMassKg: v })} />
            <Input label="Body Fat (%)" value={bmi.bodyFatPercentage} onChange={(v) => setBmi({ ...bmi, bodyFatPercentage: v })} />
          </div>
        </section>

        {!updateMode && (
          <section className="rounded-3xl border border-white/10 bg-white/[.04] p-5">
            <h2 className="text-xl font-black">What's Your Target?</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <GoalCard selected={goalType === "WEIGHT_LOSS"} icon={<Scale />} title="Weight Loss" text="Reduce body weight and track your progress every 45 days." onClick={() => setGoalType("WEIGHT_LOSS")} />
              <GoalCard selected={goalType === "MUSCLE_GAIN"} icon={<Dumbbell />} title="Muscle Gain" text="Increase skeletal muscle mass and track your progress every 45 days." onClick={() => setGoalType("MUSCLE_GAIN")} />
            </div>
            <div className="mt-5 rounded-2xl bg-black/25 p-4">
              <p className="text-sm text-white/45">{goalType === "WEIGHT_LOSS" ? "Current Weight" : "Current Muscle Mass"}</p>
              <b>{Number.isFinite(goalCurrent) && goalCurrent > 0 ? goalCurrent.toFixed(1) : "--"} kg</b>
              <p className="text-xs text-white/45">As per BMI Report</p>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Input label={goalType === "WEIGHT_LOSS" ? "Target Weight (kg)" : "Target Muscle Mass (kg)"} value={targetValue} onChange={setTargetValue} />
              <Input label="Start Date" type="date" value={startDate} onChange={setStartDate} />
              <Input label="Target End Date" type="date" value={targetEndDate} min={startDate} onChange={setTargetEndDate} />
            </div>
          </section>
        )}

        {activeTarget && updateMode && <p className="text-sm text-white/55">Active target: <b>{label(activeTarget.goalType)}</b></p>}
        {error && <p className="rounded-2xl border border-red-400/25 bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
        <button disabled={submitting} className="min-h-12 w-full rounded-2xl bg-zenith-400 px-5 font-black text-black disabled:opacity-60">{submitting ? "Saving..." : updateMode ? "Save BMI & Check Progress" : "Set My Target"}</button>
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return <main className="safe-bottom mx-auto min-h-dvh max-w-3xl px-4 pb-28 pt-6"><Link href="/dashboard" className="inline-flex min-h-11 items-center gap-2 text-sm text-white/60"><ArrowLeft size={18} /> Dashboard</Link>{children}</main>;
}

function Input(props: { label: string; value: string; onChange: (value: string) => void; type?: string; min?: string; max?: string }) {
  return <label className="block text-sm"><span className="font-bold">{props.label}</span><input required inputMode={props.type === "date" ? undefined : "decimal"} type={props.type ?? "number"} step={props.type === "date" ? undefined : "0.1"} min={props.min} max={props.max} value={props.value} onChange={(event) => props.onChange(event.target.value)} className="mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-black/30 px-4 outline-none focus:border-zenith-400" /><span className="mt-1 block text-xs text-white/40">As per BMI Report</span></label>;
}

function GoalCard(props: { selected: boolean; icon: ReactNode; title: string; text: string; onClick: () => void }) {
  return <button type="button" onClick={props.onClick} className={`min-h-32 rounded-2xl border p-4 text-left ${props.selected ? "border-zenith-400 bg-zenith-400/10" : "border-white/10 bg-black/20"}`}><span className="text-zenith-300">{props.icon}</span><b className="mt-3 block">{props.title}</b><span className="mt-1 block text-sm text-white/55">{props.text}</span></button>;
}
