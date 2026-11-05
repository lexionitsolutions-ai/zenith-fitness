import type { getWeightTrainingLibrary } from "@/services/workout.service";

export function WeightTrainingLibrary({ plans }: { plans: Awaited<ReturnType<typeof getWeightTrainingLibrary>> }) {
  return <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 sm:px-8"><p className="text-xs font-bold uppercase tracking-widest text-zenith-400">Weight training</p><h1 className="mt-2 text-3xl font-black">Zenith training levels</h1>
    <section className="mt-6 space-y-4">{plans.map((plan) => <article key={plan.id} className="rounded-3xl border border-white/10 bg-white/[.04] p-5"><h2 className="text-xl font-bold">{plan.name}</h2><p className="mt-2 text-sm text-white/55">{plan.description}</p>
      <div className="mt-4 space-y-2">{plan.days.map((day) => <details key={day.id} className="rounded-2xl bg-black/20 p-4"><summary className="cursor-pointer font-bold">{day.title}</summary><p className="mt-2 text-sm text-white/55">{day.description}</p><ol className="mt-3 space-y-2">{day.exercises.map((item, index) => <li key={item.id} className="text-sm text-white/75">{index + 1}. {item.exercise.name}{item.notes && <small className="mt-1 block text-white/45">{item.notes}</small>}</li>)}</ol></details>)}</div>
    </article>)}</section>
  </main>;
}
