import type { NextConfig } from "next";
const config: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Reuse recently visited tabs in this browser for 30 seconds. API writes and
    // explicit router.refresh() remain fresh and invalidate these page snapshots.
    staleTimes: { dynamic: 30, static: 30 },
  },
};
export default config;
