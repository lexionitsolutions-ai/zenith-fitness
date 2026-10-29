import { MemberPageLoading } from "@/components/layout/member-page-loading";
import { Suspense } from "react";
import { getDashboardAnnouncements } from "@/services/announcement.service";
import { getDashboard } from "@/services/dashboard.service";
import { getSession } from "@/lib/auth/session";
import { AppError } from "@/lib/errors";
import { redirect } from "next/navigation";
import { Dashboard } from "@/components/dashboard/dashboard";
import { AnnouncementWindow } from "@/components/dashboard/announcement-window";
import { MemberBottomNav } from "@/components/layout/member-bottom-nav";
import { ZenithLogo } from "@/components/brand/zenith-logo";
import { MembershipRefresh } from "@/components/dashboard/membership-refresh";
import { purchaseOverview } from "@/services/membership-purchase.service";
import { GuestDashboard } from "@/components/membership/guest-dashboard";

async function Notices() {
  // Promotional images must not delay membership details or navigation.
  try { return <AnnouncementWindow data={await getDashboardAnnouncements()} />; }
  catch (error) { console.error("Unable to load dashboard announcements", error); return null; }
}

async function MemberDashboard({ memberId }: { memberId: string }) {
  try { return <div className="member-dashboard"><Dashboard data={await getDashboard(memberId)} /></div>; }
  catch (error) {
    if (error instanceof AppError && error.code === "MEMBER_NOT_FOUND") redirect("/api/auth/logout?next=/login");
    throw error;
  }
}

function DashboardPlaceholder() {
  return <div role="status" aria-label="Loading membership" className="mx-auto max-w-5xl space-y-4 px-5 py-8 motion-safe:animate-pulse"><div className="h-48 rounded-3xl bg-white/5" /><div className="h-28 rounded-3xl bg-white/5" /></div>;
}

async function Guest({ userId }: { userId: string }) {
  return <GuestDashboard data={await purchaseOverview(userId)} />;
}

export default async function Page() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.memberId && session.role !== "MEMBER") redirect("/login");

  if (!session.memberId) return <>
    <Suspense fallback={null}><Notices /></Suspense>
    <Suspense fallback={<MemberPageLoading active="home" title="Your membership" />}><Guest userId={session.userId} /></Suspense>
  </>;

  return <>
    <MembershipRefresh />
    <div className="app-topbar border-b border-white/10">
      <div className="safe-x mx-auto flex max-w-5xl items-center px-4 py-3 sm:px-8"><ZenithLogo compact /></div>
    </div>
    <Suspense fallback={null}><Notices /></Suspense>
    <Suspense fallback={<DashboardPlaceholder />}>
      <MemberDashboard memberId={session.memberId} />
    </Suspense>
    <MemberBottomNav active="home" />
  </>;
}
