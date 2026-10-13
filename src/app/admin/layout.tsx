import { redirect } from "next/navigation";
import { RoleBottomNav } from "@/components/layout/role-bottom-nav";
import { ZenithLogo } from "@/components/brand/zenith-logo";
import { BirthdayAlert } from "@/components/staff/birthday-alert";
import { requireActiveRole } from "@/lib/auth/authorize";
export const dynamic = "force-dynamic";
export default async function Layout({ children }: { children: React.ReactNode }) {
  try { await requireActiveRole(["ADMIN"]); } catch { redirect("/login"); }
  return <div className="pb-28"><div className="app-topbar border-b border-white/10"><div className="safe-x mx-auto flex max-w-5xl items-center px-5 py-3"><ZenithLogo compact/></div></div><BirthdayAlert/>{children}<RoleBottomNav role="ADMIN"/></div>;
}
