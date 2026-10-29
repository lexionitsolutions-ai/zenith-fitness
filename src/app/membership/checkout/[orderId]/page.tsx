import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { purchaseOverview } from "@/services/membership-purchase.service";
import { MembershipCheckout } from "@/components/membership/membership-checkout";
import { MemberBottomNav } from "@/components/layout/member-bottom-nav";
export const dynamic = "force-dynamic";
export default async function Page({ params }: { params:Promise<{orderId:string}> }) {
  const session = await getSession();
  if (!session || session.role !== "MEMBER") redirect("/login");
  const {orderId} = await params;
  const overview = await purchaseOverview(session.userId);
  if (!overview.orders.some(order => order.id === orderId)) notFound();
  return <><main className="mx-auto min-h-dvh max-w-2xl px-4 pb-32 pt-6 sm:px-6"><MembershipCheckout initial={overview} orderId={orderId}/></main><MemberBottomNav active="home"/></>;
}
