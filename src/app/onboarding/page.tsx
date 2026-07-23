import { redirect } from "next/navigation";
import { prisma } from "@/lib/database/prisma";
import { getSession } from "@/lib/auth/session";
import { ZenithLogo } from "@/components/brand/zenith-logo";
import { MemberOnboardingForm } from "@/components/auth/member-onboarding-form";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session?.memberId || session.role !== "MEMBER") redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { member: { select: { birthDate: true, fullName: true } } },
  });
  if (!user?.member) redirect("/login");

  const needsPassword = user.mustChangePassword;
  const needsBirthDate = !user.member.birthDate;
  if (!needsPassword && !needsBirthDate) redirect("/dashboard");

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-10">
      <section className="w-full max-w-md">
        <ZenithLogo className="mx-auto max-w-[180px]" priority />
        <p className="mt-5 text-sm text-zenith-400">WELCOME, {user.member.fullName.toUpperCase()}</p>
        <h1 className="mt-1 text-3xl font-black">Finish setting up your account</h1>
        <p className="mt-2 text-sm text-white/55">You only need to complete this once before using your member dashboard.</p>
        <MemberOnboardingForm needsPassword={needsPassword} needsBirthDate={needsBirthDate} />
      </section>
    </main>
  );
}
