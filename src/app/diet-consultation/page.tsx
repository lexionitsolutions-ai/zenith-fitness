import { ZenithLogo } from "@/components/brand/zenith-logo";
import { DietConsultationForm } from "@/components/diet/diet-consultation-form";
import { MemberBottomNav } from "@/components/layout/member-bottom-nav";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";
import { redirect } from "next/navigation";
import { calculateMembershipStatus } from "@/lib/utils/status";
import { authoritativeMemberships } from "@/lib/utils/management-memberships";

export default async function Page() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.memberId) redirect("/membership");

  const profile = await prisma.member.findUnique({ where: { id: session.memberId }, include: { memberships: true } });
  const active = profile ? authoritativeMemberships(profile).filter(m => calculateMembershipStatus(m.startDate, m.endDate) === "ACTIVE") : [];
  // The canonical manager stores end-start, while legacy imports include both
  // dates. Even the shortest three-calendar-month cycle has 88 elapsed days.
  const dietEligible = active.some(m => (m.planDays ?? 0) >= 88);
  if (!dietEligible) return <><main className="mx-auto min-h-dvh max-w-3xl px-5 py-12"><h1 className="text-3xl font-black">{active.length ? "Free Diet Plan" : "No Active Plan"}</h1><p className="mt-4 text-white/60">A free diet plan is included with an approved active membership of 3 months or longer.</p><a href="/membership" className="mt-6 inline-block rounded-xl bg-zenith-400 px-5 py-3 font-bold text-black">View memberships</a></main><MemberBottomNav active="diet"/></>;

  const member = profile;

  if (!member) redirect("/api/auth/logout?next=/login");

  return (
    <>
      <div className="app-topbar border-b border-white/10">
        <div className="safe-x mx-auto flex max-w-5xl items-center px-4 py-3 sm:px-8">
          <ZenithLogo compact />
        </div>
      </div>
      <main className="safe-bottom native-scroll mx-auto min-h-dvh max-w-5xl px-4 pb-32 pt-6 sm:px-8">
        <header>
          <p className="text-sm font-bold uppercase tracking-widest text-zenith-400">Members</p>
          <h1 className="mt-1 text-3xl font-black">Diet Consultation</h1>
          <p className="mt-2 max-w-2xl text-sm text-white/55">
            Share your routine, food preferences, and health notes so Zenith Fitness can prepare your diet plan.
          </p>
        </header>
        <div className="mt-6">
          <DietConsultationForm
            prefill={{
              fullName: member.fullName,
              mobileNumber: member.mobileNumber,
              gender: member.gender,
              medicalHistory: member.medicalHistory,
            }}
          />
        </div>
      </main>
      <MemberBottomNav active="diet" />
    </>
  );
}
