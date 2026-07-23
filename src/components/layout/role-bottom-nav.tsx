"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LogOut,
  MessageSquare,
  ScanLine,
  ScrollText,
  SlidersHorizontal,
  Upload,
  Users,
} from "lucide-react";

export function RoleBottomNav({ role }: { role: "ADMIN" | "STAFF" }) {
  const path = usePathname();
  const router = useRouter();
  const items =
    role === "ADMIN"
      ? [
          { href: "/admin/import", label: "Import", icon: Upload },
          { href: "/admin/announcements", label: "Posts", icon: MessageSquare },
          { href: "/admin/points", label: "Ledger", icon: ScrollText },
          { href: "/admin/staff", label: "Staff", icon: Users },
          { href: "/staff/points", label: "Adjust", icon: SlidersHorizontal },
        ]
      : [
          { href: "/staff", label: "Scan", icon: ScanLine },
          { href: "/staff/points", label: "Points", icon: SlidersHorizontal },
        ];

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <nav className="fixed bottom-3 left-1/2 z-40 flex w-[calc(100%-24px)] max-w-xl -translate-x-1/2 items-stretch rounded-2xl border border-white/10 bg-[#10201b]/95 p-2 pb-[calc(.5rem+env(safe-area-inset-bottom))] shadow-2xl backdrop-blur">
      {items.map((item) => {
        const Icon = item.icon;
        const active = path === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center rounded-xl px-1 text-[10px] sm:text-[11px] ${active ? "bg-zenith-500/20 text-zenith-400" : "text-white/55"}`}
          >
            <Icon size={19} />
            <span>{item.label}</span>
          </Link>
        );
      })}
      <button onClick={logout} className="flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center rounded-xl px-1 text-[10px] text-white/55 sm:text-[11px]">
        <LogOut size={19} />
        <span>Logout</span>
      </button>
    </nav>
  );
}
