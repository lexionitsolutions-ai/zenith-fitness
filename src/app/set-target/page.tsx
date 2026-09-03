import { redirect } from "next/navigation";
import { MemberBottomNav } from "@/components/layout/member-bottom-nav";
import { SetTargetClient } from "@/components/fitness-target/set-target-client";
import { ZenithLogo } from "@/components/brand/zenith-logo";
import { getSession } from "@/lib/auth/session";
import { getFitnessTargetOrEmpty } from "@/services/fitness-target.service";

export default async function Page() {
  const session = await getSession();
  if (!session?.memberId) redirect("/login");
  return (
    <>
      <div className="app-topbar border-b border-white/10"><div className="safe-x mx-auto flex max-w-3xl items-center px-4 py-3"><ZenithLogo compact /></div></div>
      <SetTargetClient initialData={await getFitnessTargetOrEmpty(session.memberId)} />
      <MemberBottomNav active="home" />
    </>
  );
}
