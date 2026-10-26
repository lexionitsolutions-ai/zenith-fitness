"use client";

import { ChevronLeft, ChevronRight, Flame, Instagram, LockKeyhole, Sparkles, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { getStreakAward } from "@/lib/utils/streak-awards";
import { StreakStoryDialog } from "@/components/dashboard/streak-story-dialog";
import { getNextIndiaMidnight, getZeeBusinessDate, getZeeLine, getZeeProgress, zeeStages, type ZeeStage } from "@/lib/utils/zee";

export type ZeeStreakProps = {
  memberName: string;
  currentStreak: number;
  streakExpiresAt: string | null;
  streakExpiresSoon: boolean;
  streakBusinessDate: string;
};

function ZeeImage({ stage, large = false }: { stage: ZeeStage; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span role="img" aria-label={`Zee — ${stage.name}`} className="flex h-full items-center justify-center text-6xl">🐱</span>;
  return <Image src={stage.image} alt={`Zee — ${stage.name}`} width={512} height={512}
    sizes={large ? "(max-width: 640px) 75vw, 320px" : "(max-width: 640px) 140px, 180px"}
    loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-contain" />;
}

function ZeeGallery({ streak, onClose }: { streak: number; onClose: () => void }) {
  const current = getZeeProgress(streak);
  const [index, setIndex] = useState(current.index);
  const dialog = useRef<HTMLDialogElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const titleId = useId();
  const stage = zeeStages[index];
  const locked = streak < stage.days;
  const move = (delta: number) => setIndex(value => Math.max(0, Math.min(zeeStages.length - 1, value + delta)));

  useEffect(() => {
    const element = dialog.current!;
    const previousOverflow = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = "hidden";
    return () => { element.close(); document.body.style.overflow = previousOverflow; };
  }, []);

  return <dialog ref={dialog} aria-labelledby={titleId} onClose={() => { if (!dialog.current?.open) onClose(); }}
    onClick={event => { if (event.target === dialog.current) onClose(); }}
    onKeyDown={event => {
      if (event.key === "Tab") {
        const buttons = Array.from(dialog.current!.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
      if (event.key === "ArrowLeft") { event.preventDefault(); move(-1); }
      if (event.key === "ArrowRight") { event.preventDefault(); move(1); }
    }}
    className="zee-dialog m-auto w-[calc(100%-2rem)] max-w-lg rounded-3xl border border-amber-300/25 bg-[#10201b] p-0 text-[#f8f4e8] shadow-2xl backdrop:bg-black/80">
    <div className="max-h-[85dvh] overflow-y-auto p-5 sm:p-7">
      <header className="flex items-start justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-[.2em] text-amber-200">Tiny paws. Big streaks.</p>
          <h2 id={titleId} className="mt-2 text-2xl font-black">Zee’s evolution</h2></div>
        <button type="button" autoFocus onClick={onClose} aria-label="Close Zee’s evolution" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10"><X size={20} /></button>
      </header>
      <p className="mt-3 text-sm text-white/60">Your current streak unlocks Zee’s armor. Every little visit counts.</p>
      <div className="relative mt-4 rounded-2xl bg-gradient-to-b from-amber-200/[.08] to-transparent"
        style={{ touchAction: "pan-y" }}
        onTouchStart={event => { const t = event.touches[0]; touch.current = { x: t.clientX, y: t.clientY }; }}
        onTouchEnd={event => {
          const start = touch.current; touch.current = null;
          if (!start) return;
          const end = event.changedTouches[0];
          const dx = end.clientX - start.x;
          if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(end.clientY - start.y)) move(dx < 0 ? 1 : -1);
        }}>
        <div className={`mx-auto h-[min(38dvh,320px)] max-w-80 ${locked ? "opacity-60" : ""}`}><ZeeImage key={stage.image} stage={stage} large /></div>
        <span className="absolute left-3 top-3 rounded-full bg-black/40 px-3 py-1 text-xs font-bold text-amber-100">Day {stage.days}{stage.days === 100 ? "+" : ""}</span>
        {locked && <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-black/60 px-3 py-1 text-xs"><LockKeyhole size={12} /> Locked preview</span>}
      </div>
      <div className="mt-3 text-center" aria-live="polite" aria-atomic="true">
        <h3 className="text-xl font-black">{stage.name}</h3>
        <p className="mt-1 min-h-10 text-sm text-white/65">{locked ? `${stage.days - streak} more streak days to unlock` : index === current.index ? "Your current Zee" : "Unlocked with your current streak"}</p>
      </div>
      <nav aria-label="Zee evolution stages" className="mt-3 flex items-center justify-between gap-3">
        <button type="button" onClick={() => move(-1)} disabled={index === 0} aria-label="Previous Zee stage" className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 disabled:opacity-25"><ChevronLeft /></button>
        <span className="text-sm text-white/55">{index + 1} / {zeeStages.length}</span>
        <button type="button" onClick={() => move(1)} disabled={index === zeeStages.length - 1} aria-label="Next Zee stage" className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 disabled:opacity-25"><ChevronRight /></button>
      </nav>
      <div className="mt-4 grid grid-cols-5 gap-2" aria-label="Jump to a Zee stage">
        {zeeStages.map((item, i) => <button type="button" key={item.days} onClick={() => setIndex(i)}
          aria-label={`Day ${item.days}: ${item.name}${streak < item.days ? ", locked preview" : ", unlocked"}`}
          aria-pressed={index === i}
          className={`flex min-h-11 items-center justify-center gap-1 rounded-xl border text-xs font-bold ${index === i ? "border-amber-300 bg-amber-300/15 text-amber-100" : "border-white/10 bg-white/5 text-white/60"}`}>
          {streak < item.days && <LockKeyhole size={10} />} {item.days}
        </button>)}
      </div>
      <p className="mt-4 text-center text-xs text-white/45">Swipe to explore · A fresh streak starts Zee’s journey again.</p>
    </div>
  </dialog>;
}

export function ZeeStreakCard(props: ZeeStreakProps) {
  const router = useRouter();
  const [businessDate, setBusinessDate] = useState(props.streakBusinessDate);
  const [clock, setClock] = useState<number | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const opener = useRef<HTMLButtonElement | null>(null);
  const expiresAt = props.streakExpiresAt ? Date.parse(props.streakExpiresAt) : null;
  const expired = clock !== null && expiresAt !== null && clock > expiresAt;
  const streak = expired ? 0 : props.currentStreak;
  const expiresSoon = streak > 0 && (clock !== null && expiresAt !== null ? expiresAt - clock <= 4 * 3600000 : props.streakExpiresSoon);
  const progress = getZeeProgress(streak);
  const award = getStreakAward(streak);
  const quote = getZeeLine(streak, businessDate, expiresSoon);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const sync = (refresh: boolean) => {
      const now = new Date();
      setClock(now.getTime());
      setBusinessDate(getZeeBusinessDate(now));
      if (refresh) router.refresh();
      const deadlines = [getNextIndiaMidnight(now).getTime()];
      if (expiresAt !== null) deadlines.push(expiresAt - 4 * 3600000, expiresAt + 1);
      const next = Math.min(...deadlines.filter(time => time > now.getTime()));
      clearTimeout(timer);
      timer = setTimeout(() => sync(true), next - now.getTime() + 50);
    };
    const focus = () => sync(true);
    const visible = () => { if (document.visibilityState === "visible") sync(true); };
    sync(false);
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", visible);
    return () => { clearTimeout(timer); window.removeEventListener("focus", focus); document.removeEventListener("visibilitychange", visible); };
  }, [expiresAt, router]);

  const openGallery = (button: HTMLButtonElement) => { opener.current = button; setGalleryOpen(true); };
  const closeGallery = () => { setGalleryOpen(false); requestAnimationFrame(() => opener.current?.focus()); };

  return <article className="zee-card relative min-w-0 overflow-hidden rounded-3xl border border-amber-300/25 bg-gradient-to-br from-amber-300/[.09] via-amber-300/[.04] to-emerald-950/30 p-5 sm:p-6">
    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-amber-200"><Flame size={14} /> Daily streak</div>
    <div className="mt-2 grid grid-cols-[minmax(0,1fr)_minmax(100px,42%)] items-center gap-2">
      <div className="min-w-0 py-3">
        <h2 className="text-3xl font-black tracking-tight">{progress.days} <span className="text-xl">day{progress.days === 1 ? "" : "s"}</span></h2>
        <p className="mt-2 text-base font-black text-amber-100">{expiresSoon ? "⏳" : award.emoji} {award.label}</p>
        <p className="mt-2 text-xs leading-relaxed text-white/60">Scan daily to keep your streak alive.</p>
      </div>
      <button type="button" onClick={event => openGallery(event.currentTarget)} aria-label="Meet Zee and explore her evolution"
        className="relative h-40 min-w-0 rounded-2xl transition-transform duration-300 hover:-translate-y-1 motion-reduce:transform-none motion-reduce:transition-none sm:h-44">
        <span aria-hidden="true" className="absolute inset-3 rounded-full bg-amber-200/10 blur-2xl" />
        <span className="relative block h-full"><ZeeImage key={progress.stage.image} stage={progress.stage} /></span>
      </button>
    </div>
    <div className="relative mt-2 rounded-2xl border border-amber-200/10 bg-black/20 px-4 py-3">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.2em] text-amber-200/75"><Sparkles size={12} /> Zee says</p>
      <p className="mt-2 text-sm font-medium leading-relaxed text-amber-50" aria-live="polite">“{quote}”</p>
    </div>
    {expiresSoon && <p role="status" className="mt-3 rounded-xl bg-amber-300/10 px-3 py-2 text-xs font-bold leading-relaxed text-amber-200">Your streak expires soon. Have staff scan your visit before it ends.</p>}
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs leading-relaxed text-white/55">{progress.next ? <><b className="text-amber-100">{progress.remaining} more day{progress.remaining === 1 ? "" : "s"}</b> to Zee’s next look</> : <><b className="text-amber-100">Legendary Zee unlocked.</b> Keep showing up!</>}</p>
      <button type="button" onClick={event => openGallery(event.currentTarget)} className="inline-flex min-h-11 items-center gap-1 text-xs font-bold text-amber-200">Zee’s evolution <ChevronRight size={15} /></button>
    </div>
    <button type="button" onClick={event => { opener.current = event.currentTarget; setStoryOpen(true); }}
      className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-pink-300/25 bg-gradient-to-r from-fuchsia-500/15 via-pink-500/15 to-orange-400/15 px-4 py-3 text-sm font-bold text-pink-100 transition-colors hover:border-pink-300/50 hover:bg-pink-400/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink-300">
      <Instagram size={18} className="shrink-0 text-pink-300" /> Flex your streak on Instagram
    </button>
    {galleryOpen && <ZeeGallery streak={progress.days} onClose={closeGallery} />}
    {storyOpen && <StreakStoryDialog name={props.memberName} streak={progress.days} businessDate={businessDate}
      onClose={() => { setStoryOpen(false); requestAnimationFrame(() => opener.current?.focus()); }} />}
  </article>;
}
