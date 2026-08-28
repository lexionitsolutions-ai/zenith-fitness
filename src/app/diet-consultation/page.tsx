import { ZenithLogo } from "@/components/brand/zenith-logo";
import { DietConsultationForm } from "@/components/diet/diet-consultation-form";
import { MemberBottomNav } from "@/components/layout/member-bottom-nav";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/database/prisma";
import { redirect } from "next/navigation";

export default async function Page() {
  const session = await getSession();
  if (!session?.memberId) redirect("/login");

  const member = await prisma.member.findUnique({
    where: { id: session.memberId },
    select: { fullName: true, mobileNumber: true, gender: true, medicalHistory: true },
  });

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
