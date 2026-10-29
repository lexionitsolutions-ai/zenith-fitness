import Link from "next/link";
import { Apple, CalendarDays, Dumbbell, Home, QrCode } from "lucide-react";

type MemberNavKey = "home" | "points" | "schedule" | "workout" | "diet";

export function MemberBottomNav({ active }: { active: MemberNavKey }) {
  const items = [
    { key: "home", href: "/dashboard", label: "Home", icon: Home },
    { key: "workout", href: "/workout", label: "Workout", icon: Dumbbell },
    { key: "diet", href: "/diet-consultation", label: "Diet / PT", icon: Apple },
    { key: "points", href: "/points", label: "Points", icon: QrCode },
    { key: "schedule", href: "/schedule", label: "Schedule", icon: CalendarDays },
  ] as const;

  return (
    <nav aria-label="Member navigation" className="fixed bottom-3 left-1/2 z-30 flex w-[calc(100%-24px)] max-w-md -translate-x-1/2 justify-around rounded-2xl border border-white/10 bg-[#10201b]/95 p-2 pb-[calc(.5rem+env(safe-area-inset-bottom))] shadow-2xl backdrop-blur">
      {items.map((item) => {
        const Icon = item.icon;
        const on = item.key === active;
        return (
          <Link key={item.key} href={item.href} aria-current={on ? "page" : undefined} className={`flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center rounded-xl px-1 text-[11px] transition ${on ? "bg-zenith-500/20 text-zenith-400" : "text-white/55 hover:bg-white/5 hover:text-white"}`}>
            <Icon size={19} />
            <span className="mt-0.5 whitespace-nowrap">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
