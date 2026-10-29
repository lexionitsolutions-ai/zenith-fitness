"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { unregisterPushNotifications } from "@/components/notifications/push-notification-registration";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    setBusy(true); setError("");
    try {
      await unregisterPushNotifications().catch(() => {});
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) throw new Error("Unable to log out. Please try again.");
      router.replace("/login"); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Please try again."); setBusy(false); }
  }
  return <div className="text-right"><button type="button" disabled={busy} onClick={logout} className="min-h-11 rounded-full border border-white/10 px-4 text-sm disabled:opacity-50">{busy ? "Logging out…" : "Log out"}</button>{error && <p role="alert" className="mt-2 max-w-48 text-xs text-red-200">{error}</p>}</div>;
}
