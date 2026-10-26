import { redirect } from "next/navigation";
import { MemberBottomNav } from "@/components/layout/member-bottom-nav";
import { SetTargetClient } from "@/components/fitness-target/set-target-client";
import { ZenithLogo } from "@/components/brand/zenith-logo";
import { getSession } from "@/lib/auth/session";
import { getFitnessTargetOrEmpty } from "@/services/fitness-target.service";

export default async function Page({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const session = await getSession();
  if (!session?.memberId) redirect("/login");
  const data = await getFitnessTargetOrEmpty(session.memberId);
  const { mode } = await searchParams;
  if (data.target?.status === "COMPLETED" && mode !== "new") redirect("/my-progress");
  return (
    <>
      <div className="app-topbar border-b border-white/10"><div className="safe-x mx-auto flex max-w-3xl items-center px-4 py-3"><ZenithLogo compact /></div></div>
      <SetTargetClient initialData={data} />
      <MemberBottomNav active="home" />
    </>
  );
}
