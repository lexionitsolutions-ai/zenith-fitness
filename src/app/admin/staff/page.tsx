import { redirect } from "next/navigation";
import { prisma } from "@/lib/database/prisma";
import { requireActiveRole } from "@/lib/auth/authorize";
import { StaffManagement } from "@/components/admin/staff-management";

export default async function StaffPage() {
  try {
    await requireActiveRole(["ADMIN"]);
  } catch {
    redirect("/login");
  }
  const staff = await prisma.user.findMany({
    where: { role: "STAFF", isActive: true },
    select: {
      id: true,
      displayName: true,
      mobileNumber: true,
      createdAt: true,
      lastLoginAt: true,
    },
    orderBy: { displayName: "asc" },
  });
  return <StaffManagement initial={JSON.parse(JSON.stringify(staff))} />;
}
