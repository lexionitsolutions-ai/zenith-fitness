"use client";

import { RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const EDGE_WIDTH = 28;
const BACK_DISTANCE = 90;
const MAX_VERTICAL_DRIFT = 55;
const REFRESH_DISTANCE = 86;

export function MobileNavigationGestures() {
  const router = useRouter();
  const start = useRef<{ x: number; y: number; atTop: boolean; edge: boolean } | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    function editable(target: EventTarget | null) {
      return target instanceof HTMLElement && !!target.closest("input, textarea, select, button, a, [role='button']");
    }

    function touchStart(event: TouchEvent) {
      if (event.touches.length !== 1 || editable(event.target)) return;
      const touch = event.touches[0];
      start.current = { x: touch.clientX, y: touch.clientY, atTop: window.scrollY <= 0, edge: touch.clientX <= EDGE_WIDTH };
    }

    function touchMove(event: TouchEvent) {
      const first = start.current;
      if (!first || event.touches.length !== 1) return;
      const touch = event.touches[0];
      const dy = touch.clientY - first.y;
      const dx = touch.clientX - first.x;
      if (first.atTop && dy > 0 && Math.abs(dx) < 45) {
        setPull(Math.min(REFRESH_DISTANCE, dy * 0.55));
      }
    }

    function touchEnd(event: TouchEvent) {
      const first = start.current;
      start.current = null;
      setPull(0);
      if (!first || event.changedTouches.length !== 1) return;
      const touch = event.changedTouches[0];
      const dx = touch.clientX - first.x;
      const dy = touch.clientY - first.y;
      if (first.edge && dx >= BACK_DISTANCE && Math.abs(dy) <= MAX_VERTICAL_DRIFT) {
        router.back();
        return;
      }
      if (first.atTop && dy >= REFRESH_DISTANCE) {
        setRefreshing(true);
        router.refresh();
        window.setTimeout(() => setRefreshing(false), 700);
      }
    }

    window.addEventListener("touchstart", touchStart, { passive: true });
    window.addEventListener("touchmove", touchMove, { passive: true });
    window.addEventListener("touchend", touchEnd, { passive: true });
    window.addEventListener("touchcancel", touchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", touchStart);
      window.removeEventListener("touchmove", touchMove);
      window.removeEventListener("touchend", touchEnd);
      window.removeEventListener("touchcancel", touchEnd);
    };
  }, [router]);

  const visible = pull > 8 || refreshing;
  return (
    <div aria-hidden={!visible} className={`pointer-events-none fixed left-1/2 top-[calc(env(safe-area-inset-top)+.75rem)] z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-[#10201b]/95 px-3 py-2 text-xs font-bold text-white shadow-2xl transition ${visible ? "opacity-100" : "opacity-0"}`} style={{ transform: `translate(-50%, ${Math.min(pull, 44)}px)` }}>
      <RotateCw size={15} className={refreshing ? "animate-spin text-zenith-300" : "text-white/60"} />
      {refreshing ? "Refreshing" : pull >= REFRESH_DISTANCE * 0.8 ? "Release to refresh" : "Pull to refresh"}
    </div>
  );
}
