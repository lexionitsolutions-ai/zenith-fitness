"use client";

import { AlertTriangle, ArrowRight, CreditCard, Dumbbell, Flame, TrendingDown, Trophy } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { unregisterPushNotifications } from "@/components/notifications/push-notification-registration";
import { ProfileEditor } from "@/components/dashboard/profile-editor";
import { getStreakAward } from "@/lib/utils/streak-awards";

type Data = Awaited<ReturnType<typeof import("@/services/dashboard.service").getDashboard>>;

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);

const date = (value: string | null) =>
  value ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00Z`)) : "Needs review";

const oneDecimal = (value: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(value);

function FitnessTargetCard({ data }: { data: Data["fitnessTarget"] }) {
  const target = data.target;
  if (!target) {
    return (
      <article className="rounded-3xl border border-zenith-400/25 bg-zenith-500/[.09] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-zenith-300">Set Target</p>
            <h2 className="mt-2 text-2xl font-black">Set Your Fitness Target</h2>
            <p className="mt-2 text-sm text-white/60">Track your transformation with regular BMI assessments.</p>
          </div>
          <span className="rounded-2xl bg-amber-300/15 p-3 text-amber-200"><Trophy /></span>
        </div>
        {!data.rewardClaimed && <p className="mt-5 text-sm font-bold text-amber-200">+50 Points for completing your first BMI assessment</p>}
        <button onClick={() => location.assign("/set-target")} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-zenith-400 px-5 font-bold text-black">
          Set Target <ArrowRight size={18} />
        </button>
      </article>
    );
  }
  const isWeight = target.goalType === "WEIGHT_LOSS";
  const completed = target.status === "COMPLETED" || target.progress.reached;
  const pct = Math.round(target.progress.visualPercentage);
  return (
    <article className={`rounded-3xl border p-6 ${target.bmiDue ? "border-amber-300/30 bg-amber-300/[.07]" : "border-white/10 bg-white/[.04]"}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-white/45">{completed ? "Target Reached" : "My Target"}</p>
          <h2 className="mt-2 text-2xl font-black">{isWeight ? "Weight Loss" : "Muscle Gain"}</h2>
        </div>
        <span className="rounded-2xl bg-white/10 p-3 text-zenith-300"><TrendingDown /></span>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div><p className="text-white/45">{isWeight ? "Current" : "Current Muscle"}</p><b>{oneDecimal(isWeight ? target.latest.weightKg : target.latest.skeletalMuscleMassKg)} kg</b></div>
        <div><p className="text-white/45">{isWeight ? "Target" : "Target Muscle"}</p><b>{oneDecimal(isWeight ? target.targetWeightKg! : target.targetMuscleMassKg!)} kg</b></div>
      </div>
      <div className="mt-5 h-3 overflow-hidden rounded-full bg-black/30"><div className="h-full rounded-full bg-zenith-400" style={{ width: `${pct}%` }} /></div>
      <p className="mt-2 text-sm font-bold">{pct} / 100 Reached</p>
      <p className={`mt-3 text-sm ${target.bmiDue ? "font-bold text-amber-200" : "text-white/55"}`}>{target.bmiDue ? "BMI Check Due" : `Next BMI Check: ${date(target.nextBmiDate)}`}</p>
      <button onClick={() => location.assign(target.bmiDue ? "/set-target?mode=update" : completed ? "/set-target" : "/my-progress")} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-white px-5 font-bold text-black">
        {target.bmiDue ? "Update BMI" : completed ? "Set New Target" : "View Progress"} <ArrowRight size={18} />
      </button>
    </article>
  );
}

export function Dashboard({ data }: { data: Data }) {
  const router = useRouter();
  const membership = data.membership;
  const payment = data.payment;
  const streakAward = getStreakAward(data.currentStreak);

  useEffect(() => {
    const target = data.fitnessTarget.target;
    if (!target?.bmiDue) return;
    const key = `bmi-reminder:${target.id}:${target.nextBmiDate}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, new Date().toISOString());
    if (confirm("Time for Your BMI Check!\n\nIt's been 45 days since your last BMI assessment. Get your BMI test done to see how far you've progressed toward your target.")) {
      router.push("/set-target?mode=update");
    }
  }, [data.fitnessTarget.target, router]);

  async function logout() {
    await unregisterPushNotifications().catch(console.error);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <main className="safe-bottom native-scroll mx-auto min-h-dvh max-w-5xl px-4 pb-28 pt-6 sm:px-8">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-white/50">Good to see you</p>
          <h1 className="text-2xl font-bold">{data.member.name.split(" ")[0]}</h1>
          <p className="text-xs text-white/40">{data.member.admissionId}</p>
        </div>
        <button onClick={logout} className="h-11 rounded-full border border-white/10 px-4 text-sm">
          Log out
        </button>
      </header>

      <section className="mt-8 grid gap-4 md:grid-cols-2">
        <article className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-zenith-500 to-emerald-800 p-6 shadow-glow">
          <Dumbbell className="absolute right-5 top-5 text-white/25" size={48} />
          <p className="text-xs font-bold uppercase tracking-widest text-white/70">{membership?.status ?? "No membership"}</p>
          <h2 className="mt-2 text-3xl font-black">{membership?.planName ?? "Visit the front desk"}</h2>
          <p className="mt-1 text-white/70">{membership?.category ?? "No plan on record"}</p>
          <div className="mt-8 grid grid-cols-2 gap-4 border-t border-white/20 pt-5 text-sm">
            <div>
              <p className="text-white/60">Starts</p>
              <b>{date(membership?.startDate ?? null)}</b>
            </div>
            <div>
              <p className="text-white/60">Ends</p>
              <b>{date(membership?.endDate ?? null)}</b>
            </div>
          </div>
          {membership?.daysRemaining != null && (
            <p className="mt-5 text-sm">
              <strong className="text-2xl">{Math.max(0, membership.daysRemaining)}</strong> days remaining
            </p>
          )}
        </article>

        <article className="rounded-3xl border border-amber-300/25 bg-amber-300/[.07] p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-amber-200">Daily Streak</p>
              <h2 className="mt-2 text-3xl font-black">{data.currentStreak} day{data.currentStreak === 1 ? "" : "s"}</h2>
              <p className="mt-1 text-lg font-black text-amber-100">{streakAward.emoji} {streakAward.label}</p>
              <p className="mt-2 text-sm text-white/58">Scan daily to keep your streak alive.</p>
            </div>
            <span className="rounded-2xl bg-amber-300/15 p-3 text-amber-200"><Flame /></span>
          </div>
        </article>
      </section>

      <section className="mt-7">
        <FitnessTargetCard data={data.fitnessTarget} />
      </section>

      <section className="mt-7 grid gap-4 md:grid-cols-2">
        {payment && (
          <article className="rounded-3xl border border-white/10 bg-white/[.04] p-6">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-white/10 p-2">
                <CreditCard />
              </span>
              <div>
                <p className="text-xs text-white/50">PAYMENT</p>
                <h2 className="font-bold">{payment.paymentStatus}</h2>
              </div>
            </div>
            <div className="mt-7 grid grid-cols-3 gap-2">
              <div>
                <p className="text-xs text-white/45">Total</p>
                <b>{money(payment.finalAmount)}</b>
              </div>
              <div>
                <p className="text-xs text-white/45">Paid</p>
                <b>{money(payment.amountPaid)}</b>
              </div>
              <div>
                <p className="text-xs text-white/45">Pending</p>
                <b className="text-amber-300">{money(payment.pendingAmount)}</b>
              </div>
            </div>
            <p className="mt-6 text-sm text-white/50">Mode: {payment.paymentMode ?? "Not recorded"}</p>
          </article>
        )}
      </section>

      {data.alerts.length > 0 && (
        <section className="mt-7 space-y-3">
          <h2 className="font-bold">For you</h2>
          {data.alerts.map((alert) => (
            <article key={alert.type} className="flex gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/[.07] p-4">
              <AlertTriangle className="shrink-0 text-amber-300" size={20} />
              <div>
                <b className="text-sm">{alert.title}</b>
                <p className="text-sm text-white/55">{alert.message}</p>
              </div>
            </article>
          ))}
        </section>
      )}

      <section className="mt-7 rounded-3xl border border-white/10 bg-white/[.04] p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Profile</h2>
          <span className="text-sm text-zenith-400">{data.member.profileCompletionPercentage}% complete</span>
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-white/40">Member</dt>
            <dd>{data.member.name}</dd>
          </div>
          <div>
            <dt className="text-white/40">Mobile</dt>
            <dd>{data.member.mobile ?? "Missing"}</dd>
          </div>
          <div>
            <dt className="text-white/40">Gender</dt>
            <dd>{data.member.gender ?? "Missing"}</dd>
          </div>
          <div>
            <dt className="text-white/40">Birth date</dt>
            <dd>{data.member.birthDate ?? "Missing"}</dd>
          </div>
          <div>
            <dt className="text-white/40">Address</dt>
            <dd>{data.member.address ?? "Missing"}</dd>
          </div>
          <div>
            <dt className="text-white/40">Medical history</dt>
            <dd>{data.member.medicalHistory ?? "Missing"}</dd>
          </div>
        </dl>
        <ProfileEditor complete={data.member.profileCompletionPercentage === 100} profile={{ fullName: data.member.name, mobile: data.member.mobile, gender: data.member.gender, birthDate: data.member.birthDate, address: data.member.address, medicalHistory: data.member.medicalHistory }} />
      </section>
    </main>
  );
}
