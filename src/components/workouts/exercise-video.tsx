"use client";

import { useEffect, useId, useRef } from "react";
import { Play, ShieldAlert } from "lucide-react";
import { youtubeWatchUrl } from "@/lib/youtube";

declare global {
  interface Window {
    YT?: {
      Player: new (elementId: string, options: unknown) => YouTubePlayer;
      PlayerState: { ENDED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

type YouTubePlayer = {
  destroy: () => void;
  getCurrentTime?: () => number;
  playVideo?: () => void;
  seekTo?: (seconds: number, allowSeekAhead: boolean) => void;
};

type Props = {
  exerciseName: string;
  youtubeVideoId: string | null;
  videoStartSeconds?: number | null;
  videoEndSeconds?: number | null;
  status: string | null;
};

const playerReadyCallbacks: Array<() => void> = [];

function loadYouTubeApi(callback: () => void) {
  if (window.YT?.Player) return callback();
  playerReadyCallbacks.push(callback);
  if (document.querySelector("script[src='https://www.youtube.com/iframe_api']")) return;
  window.onYouTubeIframeAPIReady = () => {
    for (const ready of playerReadyCallbacks.splice(0)) ready();
  };
  const script = document.createElement("script");
  script.src = "https://www.youtube.com/iframe_api";
  document.head.appendChild(script);
}

function VideoShell({ children }: { children: React.ReactNode }) {
  return <div className="relative h-[44dvh] min-h-[320px] max-h-[430px] overflow-hidden bg-black sm:h-[52dvh]">{children}</div>;
}

export function ExerciseVideo({ exerciseName, youtubeVideoId, videoStartSeconds, videoEndSeconds, status }: Props) {
  const rawId = useId();
  const elementId = `yt-${rawId.replace(/:/g, "")}`;
  const playerRef = useRef<YouTubePlayer | null>(null);
  const start = videoStartSeconds ?? 0;
  const end = videoEndSeconds ?? null;
  const hasLoopSegment = end != null && end > start;

  useEffect(() => {
    if (!youtubeVideoId || status !== "VERIFIED") return;
    let interval: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;
    loadYouTubeApi(() => {
      if (cancelled || !window.YT?.Player) return;
      playerRef.current = new window.YT.Player(elementId, {
        videoId: youtubeVideoId,
        playerVars: {
          autoplay: 1,
          controls: 1,
          disablekb: 1,
          end: end ?? undefined,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          start,
        },
        events: {
          onReady: (event: { target: YouTubePlayer }) => {
            playerRef.current = event.target;
            event.target.seekTo?.(start, true);
            event.target.playVideo?.();
          },
          onStateChange: (event: { data: number; target: YouTubePlayer }) => {
            if (hasLoopSegment && event.data === window.YT?.PlayerState.ENDED) {
              event.target.seekTo?.(start, true);
              event.target.playVideo?.();
            }
          },
        },
      });
      if (hasLoopSegment) {
        interval = setInterval(() => {
          const player = playerRef.current;
          if (!player?.getCurrentTime || !player.seekTo || !player.playVideo) return;
          if (player.getCurrentTime() >= end - 0.15) {
            player.seekTo(start, true);
            player.playVideo();
          }
        }, 250);
      }
    });
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [elementId, end, hasLoopSegment, start, status, youtubeVideoId]);

  if (status === "NEEDS_OWNER_CONFIRMATION") {
    return <VideoShell><div className="flex h-full items-center justify-center p-6 text-center text-white/65"><div><ShieldAlert className="mx-auto mb-3 text-zenith-400" /><b>Trainer confirmation needed</b><p className="mt-1 text-sm">Candidate videos are saved for admin review.</p></div></div></VideoShell>;
  }
  if (!youtubeVideoId || status !== "VERIFIED") {
    return <VideoShell><div className="flex h-full items-center justify-center p-6 text-center text-white/65"><div><Play className="mx-auto mb-3 text-white/45" /><b>Video coming soon</b><p className="mt-1 text-sm">A verified exercise demo has not been approved yet.</p></div></div></VideoShell>;
  }

  return <VideoShell>
    <div className="absolute left-1/2 top-1/2 h-full w-full origin-center -translate-x-1/2 -translate-y-1/2 scale-[1.38] [&_iframe]:h-full [&_iframe]:w-full" id={elementId} title={`${exerciseName} demonstration`} />
    <a href={youtubeWatchUrl(youtubeVideoId)} target="_blank" rel="noreferrer" className="absolute bottom-3 right-3 rounded-lg bg-black/70 px-3 py-2 text-[11px] font-bold text-white/85 backdrop-blur transition hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-zenith-400">Open video</a>
  </VideoShell>;
}
