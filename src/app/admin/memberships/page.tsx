import { requireActiveRole } from "@/lib/auth/authorize";
import { MembershipApprovals } from "@/components/admin/membership-approvals";
export default async function Page() { await requireActiveRole(["ADMIN"]); return <MembershipApprovals/>; }
