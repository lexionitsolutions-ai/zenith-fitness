import Link from "next/link";
import { Dumbbell, Activity } from "lucide-react";

export function WorkoutModeToggle({ mode }: { mode: "weight" | "functional" }) {
  return <nav aria-label="Workout type" className="mx-auto grid w-full max-w-5xl grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-black/25 p-1">
    {([{ value: "weight", label: "Weight Training", icon: Dumbbell }, { value: "functional", label: "Functional Batch", icon: Activity }] as const).map((item) => {
      const Icon = item.icon;
      return <Link key={item.value} href={`/workout?mode=${item.value}`} aria-current={mode === item.value ? "page" : undefined}
        className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-2 text-center text-sm font-bold transition ${mode === item.value ? "bg-zenith-500 text-slate-950" : "text-white/60 hover:bg-white/5 hover:text-white"}`}>
        <Icon size={18} /><span>{item.label}</span>
      </Link>;
    })}
  </nav>;
}
