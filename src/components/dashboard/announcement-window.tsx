"use client";

import { Bell, Clock, Download, ExternalLink, X } from "lucide-react";
import { useEffect, useState } from "react";

type Data = Awaited<ReturnType<typeof import("@/services/announcement.service").getDashboardAnnouncements>>;

function linkedText(text: string) {
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  return text.split(urlPattern).map((part, index) => {
    if (!/^https?:\/\//.test(part)) return <span key={`${part}-${index}`}>{part}</span>;
    return (
      <a key={part} href={part} target="_blank" rel="noreferrer" className="font-bold text-zenith-300 underline decoration-zenith-300/40 underline-offset-4">
        {part}
      </a>
    );
  });
}

export function AnnouncementWindow({ data }: { data: Data }) {
  const [hidden, setHidden] = useState(false);
  const [current, setCurrent] = useState(data);

  useEffect(() => {
    let active = true;

    async function refresh() {
      try {
        const response = await fetch("/api/member/announcements", { cache: "no-store" });
        const result = await response.json();
        if (active && response.ok) setCurrent(result.data);
      } catch (error) {
        console.info("Announcement refresh failed", error);
      }
    }

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") void refresh();
    }

    document.addEventListener("visibilitychange", refreshWhenVisible);
    const timer = window.setInterval(refresh, 60_000);
    void refresh();

    return () => {
      active = false;
      document.removeEventListener("visibilitychange", refreshWhenVisible);
      window.clearInterval(timer);
    };
  }, []);

  if (hidden) return null;

  const next = current.nextBatch;
  return (
    <section className="mx-auto max-w-5xl px-4 pt-5 sm:px-8">
      <div className="relative overflow-hidden rounded-3xl border border-zenith-400/20 bg-gradient-to-r from-zenith-950 to-emerald-950 p-5 shadow-glow">
        <button onClick={() => setHidden(true)} aria-label="Dismiss announcements" className="absolute right-3 top-3 rounded-full p-2 text-white/50">
          <X size={18} />
        </button>
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-zenith-500 p-2">
            <Clock />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-zenith-400">Next batch</p>
            <h2 className="mt-1 text-xl font-black">{next.name}</h2>
            <p className="text-sm text-white/60">
              {next.dayName} - {new Date(next.startsAt).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" })}
            </p>
          </div>
        </div>

        {current.announcements.length > 0 && (
          <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
            {current.announcements.map((announcement) => (
              <article key={announcement.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex gap-2">
                  <Bell size={18} className="shrink-0 text-amber-300" />
                  <div className="min-w-0 flex-1">
                    <b className="block text-base leading-snug">{announcement.title}</b>
                    {announcement.message && <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-white/75">{linkedText(announcement.message)}</p>}
                  </div>
                </div>
                {announcement.imageData && (
                  <div className="mt-4">
                    <a href={announcement.imageData} target="_blank" rel="noreferrer" className="block rounded-2xl bg-black/30 p-2">
                      <img src={announcement.imageData} alt={announcement.title} className="max-h-[70vh] w-full rounded-xl object-contain" loading="lazy" />
                    </a>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <a href={announcement.imageData} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-sm font-bold text-white/75">
                        <ExternalLink size={16} />
                        Open
                      </a>
                      <a href={announcement.imageData} download={`${announcement.title || "zenith-announcement"}.png`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-zenith-500 px-3 text-sm font-bold text-[#07110e]">
                        <Download size={16} />
                        Download
                      </a>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
