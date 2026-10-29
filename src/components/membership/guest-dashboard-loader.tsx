"use client";

import dynamic from "next/dynamic";
import type { MembershipOverview } from "./use-membership-overview";

// Existing members should not download the signup/checkout shop on their home.
const GuestDashboard = dynamic(() => import("./guest-dashboard").then(module => module.GuestDashboard));

export function GuestDashboardLoader({ data }: { data: MembershipOverview }) {
  return <GuestDashboard data={data} />;
}
