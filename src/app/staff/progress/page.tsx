import { StaffProgressList } from "@/components/staff/staff-progress-list";
import { requireActiveRole } from "@/lib/auth/authorize";
import { getStaffMemberProgressList } from "@/services/fitness-target.service";
import { redirect } from "next/navigation";

export default async function Page() {
  try {
    await requireActiveRole(["STAFF", "ADMIN"]);
  } catch {
    redirect("/login");
  }

  return <StaffProgressList members={await getStaffMemberProgressList()} />;
}
