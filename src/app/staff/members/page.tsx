import { redirect } from "next/navigation";
import { requireActiveRole } from "@/lib/auth/authorize";
import { prisma } from "@/lib/database/prisma";
import { ensureOperationalTables } from "@/lib/database/ensure-operational-tables";
import { MemberPasswordReset } from "@/components/admin/member-password-reset";

export default async function StaffMembersPage() {
  try {
    await requireActiveRole(["ADMIN", "STAFF"]);
  } catch {
    redirect("/login");
  }

  await ensureOperationalTables();
  const requests = await prisma.passwordResetRequest.findMany({
    where: { status: "PENDING" },
    include: { user: { select: { member: { select: { fullName: true, admissionId: true, mobileNumber: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-5 py-8">
      <p className="text-sm text-zenith-400">STAFF MEMBERS</p>
      <h1 className="text-3xl font-black">Member access</h1>
      <MemberPasswordReset initialRequests={JSON.parse(JSON.stringify(requests))} />
    </main>
  );
}
