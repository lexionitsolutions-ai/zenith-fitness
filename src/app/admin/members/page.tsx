import Link from "next/link";
import { redirect } from "next/navigation";
import { requireActiveRole } from "@/lib/auth/authorize";
import { prisma } from "@/lib/database/prisma";
import { ensureOperationalTables } from "@/lib/database/ensure-operational-tables";
import { MemberPasswordReset } from "@/components/admin/member-password-reset";
import { MemberPhoneUpdate } from "@/components/admin/member-phone-update";

export default async function MembersPage() {
  try {
    await requireActiveRole(["ADMIN"]);
  } catch {
    redirect("/login");
  }

  await ensureOperationalTables();
  const pendingRenewals = await prisma.renewalRequest.count({ where: { status: "SUBMITTED" } });
  const requests = await prisma.passwordResetRequest.findMany({
    where: { status: "PENDING" },
    include: { user: { select: { member: { select: { fullName: true, admissionId: true, mobileNumber: true } } } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-5 py-8">
      <p className="text-sm text-zenith-400">ADMIN MEMBERS</p>
      <h1 className="text-3xl font-black">Member access</h1>
      <Link href="/admin/renewals" className="mt-6 flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-zenith-400/25 bg-zenith-400/10 px-5 font-bold text-zenith-400">UPI renewal approvals <span className="rounded-full bg-zenith-400 px-3 py-1 text-xs text-black">{pendingRenewals} pending</span></Link>
      <div className="mt-7">
        <MemberPhoneUpdate />
      </div>
      <MemberPasswordReset initialRequests={JSON.parse(JSON.stringify(requests))} />
    </main>
  );
}
