import { requireActiveRole } from "@/lib/auth/authorize";
import { AwardPoints } from "@/components/admin/award-points";

export default async function Page() {
  await requireActiveRole(["ADMIN"]);
  return <AwardPoints />;
}
