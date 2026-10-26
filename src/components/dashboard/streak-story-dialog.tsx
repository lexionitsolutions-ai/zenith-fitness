"use client";

import { Download, Instagram, LoaderCircle, RefreshCw, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createStreakStory, type StreakStoryData } from "@/lib/utils/streak-story";

export function StreakStoryDialog({ name, streak, businessDate, onClose }: StreakStoryData & { onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [story, setStory] = useState<{ url: string; file: File } | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [sharing, setSharing] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    const element = dialog.current!;
    const overflow = document.body.style.overflow;
    element.showModal(); document.body.style.overflow = "hidden";
    return () => { element.close(); document.body.style.overflow = overflow; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let url: string | undefined;
    setStory(null); setError(""); setNotice("");
    createStreakStory({ name, streak, businessDate }).then(blob => {
      if (cancelled) return;
      url = URL.createObjectURL(blob);
      const file = new File([blob], `zenith-${streak}-day-streak.png`, { type: "image/png" });
      setStory({ url, file });
      setCanShare(typeof navigator.share === "function" && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] }));
    }).catch(() => { if (!cancelled) setError("Couldn't prepare your story. Check your connection and try again."); });
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [name, streak, businessDate, attempt]);

  async function share() {
    if (!story || sharing) return;
    setSharing(true); setError(""); setNotice("");
    try {
      // The file is already ready, preserving the button's user activation.
      await navigator.share({ files: [story.file] });
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) {
        setNotice("Sharing isn't available right now. Download your story and upload it in Instagram.");
      }
    } finally { setSharing(false); }
  }

  return <dialog ref={dialog} aria-labelledby={titleId}
    onClose={() => { if (!dialog.current?.open) onClose(); }} onClick={event => { if (event.target === dialog.current && !sharing) onClose(); }}
    className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border border-amber-200/20 bg-[#10201b] p-0 text-[#f8f4e8] shadow-2xl backdrop:bg-black/85">
    <div className="max-h-[90dvh] overflow-y-auto p-5">
      <header className="flex items-center justify-between gap-3">
        <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-amber-200">Made for your story</p>
          <h2 id={titleId} className="mt-1 text-xl font-black">Flex your streak</h2></div>
        <button type="button" autoFocus onClick={onClose} aria-label="Close story preview" className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10"><X size={20} /></button>
      </header>
      <div className="mx-auto mt-4 aspect-[9/16] w-full max-w-[29.25dvh] overflow-hidden rounded-2xl border border-amber-200/15 bg-[#0c1b18]">
        {story ? <img src={story.url} alt={`${name}'s ${streak} day gym streak with Zee and a motivational quote`} width={1080} height={1920} className="h-full w-full object-contain" />
          : <div role="status" className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-sm text-amber-100/70">{error ? <><p>{error}</p><button type="button" onClick={() => setAttempt(value => value + 1)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white/10 px-4 font-bold"><RefreshCw size={16} /> Try again</button></> : <><LoaderCircle className="animate-spin motion-reduce:animate-none" /> Creating your story…</>}</div>}
      </div>
      <p className="mt-4 text-center text-xs leading-relaxed text-white/60">{canShare ? "Choose Instagram Stories in your share sheet, if available. You can also save the image and upload it as a Story." : "Save the image, then open Instagram → Your story and select it from your photos."}</p>
      {canShare && <button type="button" onClick={share} disabled={!story || sharing} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-600 via-pink-600 to-orange-500 px-4 text-sm font-bold text-white disabled:opacity-50">{sharing ? <LoaderCircle size={18} className="animate-spin" /> : <Instagram size={18} />} {sharing ? "Sharing…" : "Share to Instagram"}</button>}
      {story && <a href={story.url} download={story.file.name} onClick={() => setNotice("Open Instagram and add the saved image to your Story.")} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-amber-200/20 bg-white/5 text-sm font-bold text-amber-100"><Download size={17} /> Download story</a>}
      {notice && <p role="status" className="mt-3 text-center text-xs text-amber-100">{notice}</p>}
      <p className="mt-3 text-center text-[10px] uppercase tracking-widest text-white/35">1080 × 1920 · Story ready</p>
    </div>
  </dialog>;
}
