import { redirect } from "next/navigation";
import { requireActiveRole } from "@/lib/auth/authorize";
import { NotificationAdmin } from "@/components/admin/notification-admin";

export default async function AdminNotificationsPage() {
  try {
    await requireActiveRole(["ADMIN"]);
  } catch {
    redirect("/login");
  }
  return <NotificationAdmin />;
}
