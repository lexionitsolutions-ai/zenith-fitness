"use client";

import { ArrowLeft, Pencil, Save, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Snapshot = Awaited<ReturnType<typeof import("@/services/fitness-target.service").getFitnessTarget>>;
type Metric = "weightKg" | "skeletalMuscleMassKg" | "fatMassKg" | "bodyFatPercentage";
const metrics: { key: Metric; label: string; unit: string }[] = [
  { key: "weightKg", label: "Weight", unit: "kg" },
  { key: "skeletalMuscleMassKg", label: "Muscle", unit: "kg" },
  { key: "fatMassKg", label: "Fat Mass", unit: "kg" },
  { key: "bodyFatPercentage", label: "Body Fat %", unit: "%" },
];
const fmt = (value: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(value);
const date = (value: string) => new Date(`${value}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export function ProgressClient({ data }: { data: Snapshot }) {
  const router = useRouter();
  const [metric, setMetric] = useState<Metric>("weightKg");
  const [editingTarget, setEditingTarget] = useState(false);
  const [editingBmiId, setEditingBmiId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const target = data.target;
  if (!target) {
    return <main className="mx-auto min-h-dvh max-w-3xl px-4 py-6"><Back /><section className="mt-8 rounded-3xl border border-white/10 bg-white/[.04] p-6"><h1 className="text-3xl font-black">My Progress</h1><p className="mt-2 text-white/55">Set Target to start tracking your BMI history.</p><Link href="/set-target" className="mt-6 inline-flex min-h-11 items-center rounded-2xl bg-zenith-400 px-5 font-bold text-black">Set Target</Link></section></main>;
  }
  const isWeight = target.goalType === "WEIGHT_LOSS";
  const pct = Math.round(target.progress.visualPercentage);
  const change = {
    weightKg: target.latest.weightKg - target.baseline.weightKg,
    skeletalMuscleMassKg: target.latest.skeletalMuscleMassKg - target.baseline.skeletalMuscleMassKg,
    fatMassKg: target.latest.fatMassKg - target.baseline.fatMassKg,
    bodyFatPercentage: target.latest.bodyFatPercentage - target.baseline.bodyFatPercentage,
  };
  const values = target.history.map((entry) => entry[metric]);
  const min = Math.min(...values);
  const max = Math.max(...values);
  async function submitJson(url: string, body: unknown) {
    setBusy(true);
    setError("");
    const response = await fetch(url, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const json = await response.json();
    setBusy(false);
    if (!response.ok || !json.success) {
      setError(json.error?.message ?? "Unable to save changes.");
      return;
    }
    setEditingTarget(false);
    setEditingBmiId(null);
    router.refresh();
  }
  return (
    <main className="safe-bottom mx-auto min-h-dvh max-w-3xl px-4 pb-28 pt-6">
      <Back />
      <section className="mt-6 rounded-3xl border border-white/10 bg-white/[.04] p-6">
        <p className="text-sm text-zenith-300">My Progress</p>
        <h1 className="mt-1 text-3xl font-black">{isWeight ? "Weight Loss" : "Muscle Gain"}</h1>
        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <Stat label={isWeight ? "Starting Weight" : "Starting Muscle"} value={`${fmt(isWeight ? target.baseline.weightKg : target.baseline.skeletalMuscleMassKg)} kg`} />
          <Stat label={isWeight ? "Current Weight" : "Current Muscle"} value={`${fmt(isWeight ? target.latest.weightKg : target.latest.skeletalMuscleMassKg)} kg`} />
          <Stat label={isWeight ? "Target Weight" : "Target Muscle Mass"} value={`${fmt(isWeight ? target.targetWeightKg! : target.targetMuscleMassKg!)} kg`} />
          <Stat label="Next BMI Check" value={target.bmiDue ? "BMI Check Due" : date(target.nextBmiDate)} />
          <Stat label="Target Start" value={date(target.startDate)} />
          <Stat label="Target End" value={date(target.targetEndDate)} />
        </div>
        <div className="mt-6 h-3 overflow-hidden rounded-full bg-black/30"><div className="h-full rounded-full bg-zenith-400" style={{ width: `${pct}%` }} /></div>
        <p className="mt-2 font-black">{pct} / 100 Reached</p>
        <p className="text-sm text-white/55">{fmt(target.progress.progressAmount)} / {fmt(target.progress.totalRequired)} kg {isWeight ? "Progress" : "Muscle Gained"}</p>
        <button onClick={() => setEditingTarget(true)} className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-bold"><Pencil size={16} /> Edit Target</button>
        {editingTarget && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              submitJson("/api/member/fitness-target", {
                targetWeightKg: isWeight ? form.get("targetValue") : undefined,
                targetMuscleMassKg: isWeight ? undefined : form.get("targetValue"),
                targetEndDate: form.get("targetEndDate"),
              });
            }}
            className="mt-4 grid gap-3 rounded-2xl bg-black/25 p-4 sm:grid-cols-2"
          >
            <Input name="targetValue" label={isWeight ? "Target Weight (kg)" : "Target Muscle Mass (kg)"} defaultValue={String(isWeight ? target.targetWeightKg : target.targetMuscleMassKg)} />
            <Input name="targetEndDate" label="Target End Date" type="date" defaultValue={target.targetEndDate} />
            <div className="flex gap-2 sm:col-span-2">
              <button disabled={busy} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-zenith-400 px-4 text-sm font-bold text-black"><Save size={16} /> Save</button>
              <button type="button" onClick={() => setEditingTarget(false)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-bold"><X size={16} /> Cancel</button>
            </div>
          </form>
        )}
      </section>

      <section className="mt-5 rounded-3xl border border-white/10 bg-white/[.04] p-6">
        <h2 className="font-black">Latest BMI Report</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <Stat label="Weight" value={withChange(target.latest.weightKg, "kg", change.weightKg, "kg")} />
          <Stat label="Skeletal Muscle Mass" value={withChange(target.latest.skeletalMuscleMassKg, "kg", change.skeletalMuscleMassKg, "kg")} />
          <Stat label="Fat Mass" value={withChange(target.latest.fatMassKg, "kg", change.fatMassKg, "kg")} />
          <Stat label="Body Fat %" value={withChange(target.latest.bodyFatPercentage, "%", change.bodyFatPercentage, "percentage points")} />
        </div>
        {error && <p className="mt-4 rounded-xl bg-red-400/10 p-3 text-sm text-red-200">{error}</p>}
      </section>

      <section className="mt-5 rounded-3xl border border-white/10 bg-white/[.04] p-6">
        <h2 className="font-black">Progress Graph</h2>
        <div className="mt-4 flex flex-wrap gap-2">{metrics.map((item) => <button key={item.key} onClick={() => setMetric(item.key)} className={`min-h-10 rounded-xl px-3 text-sm font-bold ${metric === item.key ? "bg-zenith-400 text-black" : "bg-black/25 text-white/65"}`}>{item.label}</button>)}</div>
        {target.history.length < 2 ? <p className="mt-5 text-sm text-white/45">Your progress graph will appear after your next BMI assessment.</p> : <div className="mt-5 flex h-44 items-end gap-3 border-b border-l border-white/10 p-3">{target.history.map((entry) => <div key={entry.id} className="flex flex-1 flex-col items-center gap-2"><div className="w-full rounded-t bg-zenith-400" style={{ height: `${max === min ? 60 : 15 + ((entry[metric] - min) / (max - min)) * 120}px` }} /><span className="text-[10px] text-white/45">{new Date(`${entry.assessmentDate}T00:00:00Z`).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span></div>)}</div>}
      </section>

      <section className="mt-5 rounded-3xl border border-white/10 bg-white/[.04] p-6">
        <h2 className="font-black">BMI History</h2>
        <div className="mt-4 space-y-3">{target.history.slice().reverse().map((entry) => <article key={entry.id} className="rounded-2xl bg-black/25 p-4">
          <div className="flex items-center justify-between gap-3"><b>{date(entry.assessmentDate)}</b><button onClick={() => setEditingBmiId(entry.id)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white/10 px-3 text-sm font-bold"><Pencil size={15} /> Edit</button></div>
          {editingBmiId === entry.id ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                submitJson("/api/member/fitness-target/bmi-assessment", {
                  assessmentId: entry.id,
                  assessmentDate: form.get("assessmentDate"),
                  weightKg: form.get("weightKg"),
                  skeletalMuscleMassKg: form.get("skeletalMuscleMassKg"),
                  fatMassKg: form.get("fatMassKg"),
                  bodyFatPercentage: form.get("bodyFatPercentage"),
                });
              }}
              className="mt-4 grid gap-3 sm:grid-cols-2"
            >
              <Input name="assessmentDate" label="BMI Test Date" type="date" defaultValue={entry.assessmentDate} />
              <Input name="weightKg" label="Current Weight (kg)" defaultValue={String(entry.weightKg)} />
              <Input name="skeletalMuscleMassKg" label="Skeletal Muscle Mass (kg)" defaultValue={String(entry.skeletalMuscleMassKg)} />
              <Input name="fatMassKg" label="Fat Mass (kg)" defaultValue={String(entry.fatMassKg)} />
              <Input name="bodyFatPercentage" label="Body Fat (%)" defaultValue={String(entry.bodyFatPercentage)} />
              <div className="flex gap-2 sm:col-span-2">
                <button disabled={busy} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-zenith-400 px-4 text-sm font-bold text-black"><Save size={16} /> Save BMI</button>
                <button type="button" onClick={() => setEditingBmiId(null)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-bold"><X size={16} /> Cancel</button>
              </div>
            </form>
          ) : <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-white/65"><span>Weight {fmt(entry.weightKg)} kg</span><span>Muscle {fmt(entry.skeletalMuscleMassKg)} kg</span><span>Fat Mass {fmt(entry.fatMassKg)} kg</span><span>Body Fat {fmt(entry.bodyFatPercentage)}%</span></div>}
        </article>)}</div>
      </section>
    </main>
  );
}

function Back() {
  return <Link href="/dashboard" className="inline-flex min-h-11 items-center gap-2 text-sm text-white/60"><ArrowLeft size={18} /> Dashboard</Link>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-black/20 p-3"><p className="text-xs text-white/40">{label}</p><b className="text-sm">{value}</b></div>;
}

function signed(value: number) {
  return `${value > 0 ? "+" : ""}${fmt(value)}`;
}

function withChange(value: number, unit: string, change: number, changeUnit: string) {
  if (Math.abs(change) < 0.05) return `${fmt(value)}${unit === "%" ? "%" : ` ${unit}`}`;
  return `${fmt(value)}${unit === "%" ? "%" : ` ${unit}`} (${signed(change)} ${changeUnit})`;
}

function Input(props: { name: string; label: string; defaultValue: string; type?: string }) {
  return <label className="block text-sm"><span className="font-bold">{props.label}</span><input required name={props.name} type={props.type ?? "number"} step={props.type === "date" ? undefined : "0.1"} defaultValue={props.defaultValue} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-black/30 px-3 outline-none focus:border-zenith-400" /></label>;
}
