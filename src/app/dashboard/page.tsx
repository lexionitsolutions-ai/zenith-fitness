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

export default async function Page() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.memberId && session.role === "MEMBER") {
    const [overview, notices] = await Promise.all([purchaseOverview(session.userId), getDashboardAnnouncements()]);
    return <><AnnouncementWindow data={notices}/><GuestDashboard data={overview}/></>;
  }
  if (!session.memberId) redirect("/login");

  try {
    const [dashboard, notices] = await Promise.all([getDashboard(session.memberId), getDashboardAnnouncements()]);
    return (
      <>
        <MembershipRefresh />
        <div className="app-topbar border-b border-white/10">
          <div className="safe-x mx-auto flex max-w-5xl items-center px-4 py-3 sm:px-8">
            <ZenithLogo compact />
          </div>
        </div>
        <AnnouncementWindow data={notices} />
        <div className="member-dashboard">
          <Dashboard data={dashboard} />
        </div>
        <MemberBottomNav active="home" />
      </>
    );
  } catch (error) {
    if (error instanceof AppError && error.code === "MEMBER_NOT_FOUND") {
      redirect("/api/auth/logout?next=/login");
    }
    throw error;
  }
}
