"use client";

import { AlertTriangle, CreditCard, Dumbbell } from "lucide-react";
import { useRouter } from "next/navigation";
import { unregisterPushNotifications } from "@/components/notifications/push-notification-registration";
import { ProfileEditor } from "@/components/dashboard/profile-editor";

type Data = Awaited<ReturnType<typeof import("@/services/dashboard.service").getDashboard>>;

const money = (value: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);

const date = (value: string | null) =>
  value ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T00:00:00Z`)) : "Needs review";

export function Dashboard({ data }: { data: Data }) {
  const router = useRouter();
  const membership = data.membership;
  const payment = data.payment;

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
        <ProfileEditor profile={{ gender: data.member.gender, birthDate: data.member.birthDate, address: data.member.address, medicalHistory: data.member.medicalHistory }} />
      </section>
    </main>
  );
}
