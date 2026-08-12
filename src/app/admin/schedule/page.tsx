import { redirect } from "next/navigation";
import { requireActiveRole } from "@/lib/auth/authorize";
import { prisma } from "@/lib/database/prisma";
import { ensureOperationalTables } from "@/lib/database/ensure-operational-tables";
import { ScheduleAdmin } from "@/components/admin/schedule-admin";

export default async function AdminSchedulePage() {
  try {
    await requireActiveRole(["ADMIN"]);
  } catch {
    redirect("/login");
  }
  await ensureOperationalTables();
  const rows = await prisma.scheduleSession.findMany({ where: { isActive: true }, orderBy: [{ day: "asc" }, { time: "asc" }] });
  return <ScheduleAdmin initial={JSON.parse(JSON.stringify(rows))} />;
}
