"use client";

import { useEffect, useId, useRef, useState } from "react";
import { youtubeEmbedUrl } from "@/lib/youtube";
import { loadYouTubeApi, type YouTubePlayer } from "./exercise-video";

export type FunctionalVideoSource = {
  name: string; videoUrl: string; youtubeVideoId: string | null;
  videoStartSeconds: number; videoEndSeconds: number | null; videoLayout: string;
};

function TrainerYouTube({ exercise, playing, onMediaPlayingChange, onError }: {
  exercise: FunctionalVideoSource; playing: boolean; onMediaPlayingChange?: (value: boolean) => void; onError: () => void;
}) {
  const elementId = `functional-${useId().replace(/:/g, "")}`;
  const player = useRef<YouTubePlayer | null>(null);
  const requested = useRef(playing);
  const callbacks = useRef({ onMediaPlayingChange, onError });
  callbacks.current = { onMediaPlayingChange, onError }; requested.current = playing;
  useEffect(() => {
    let cancelled = false;
    callbacks.current.onMediaPlayingChange?.(false);
    loadYouTubeApi(() => {
      if (cancelled || !window.YT?.Player) return;
      player.current = new window.YT.Player(elementId, {
        host: "https://www.youtube-nocookie.com", videoId: exercise.youtubeVideoId,
        width: "100%", height: "100%",
        playerVars: { autoplay: 0, controls: 0, mute: 1, playsinline: 1, rel: 0, start: exercise.videoStartSeconds, end: exercise.videoEndSeconds ?? undefined, origin: window.location.origin },
        events: {
          onReady: (event: { target: YouTubePlayer }) => {
            player.current = event.target; event.target.mute?.();
            const iframe = event.target.getIframe?.(); if (iframe) iframe.title = `${exercise.name} demonstration`;
            if (requested.current) event.target.playVideo?.();
          },
          onStateChange: (event: { data: number; target: YouTubePlayer }) => {
            callbacks.current.onMediaPlayingChange?.(event.data === 1);
            if (event.data === 0 && requested.current) { event.target.seekTo?.(exercise.videoStartSeconds, true); event.target.playVideo?.(); }
          },
          onError: () => { callbacks.current.onMediaPlayingChange?.(false); callbacks.current.onError(); },
        },
      });
    });
    return () => { cancelled = true; player.current?.destroy(); player.current = null; callbacks.current.onMediaPlayingChange?.(false); };
  }, [elementId, exercise.youtubeVideoId, exercise.videoStartSeconds, exercise.videoEndSeconds, exercise.name]);
  useEffect(() => { if (playing) player.current?.playVideo?.(); else player.current?.pauseVideo?.(); }, [playing]);
  return <div className={`${exercise.videoLayout === "CENTER_CROP" ? "absolute left-1/2 top-0 h-full w-[316%] max-w-none -translate-x-1/2" : "h-full w-full"} [&_iframe]:h-full [&_iframe]:w-full`}><div id={elementId} className="h-full w-full" /></div>;
}

export function FunctionalVideo({ exercise, playing, onPlayingChange, onMediaPlayingChange, preview = false }: {
  exercise: FunctionalVideoSource; playing?: boolean; onPlayingChange?: (playing: boolean) => void; onMediaPlayingChange?: (value: boolean) => void; preview?: boolean;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState(false);
  const embedded = Boolean(exercise.youtubeVideoId && /^https:\/\/(www\.)?youtube(-nocookie)?\.com\/embed\//.test(exercise.videoUrl));
  useEffect(() => {
    if (preview || embedded) return;
    if (!video.current) return;
    if (playing) video.current.play().catch(() => onPlayingChange?.(false));
    else video.current.pause();
  }, [playing, exercise.videoUrl, embedded, preview, onPlayingChange]);
  useEffect(() => { if (!preview) onMediaPlayingChange?.(false); }, [exercise.videoUrl, preview, onMediaPlayingChange]);
  const youtubeBase = exercise.youtubeVideoId ? youtubeEmbedUrl(exercise.youtubeVideoId, {
    startSeconds: exercise.videoStartSeconds, endSeconds: exercise.videoEndSeconds, loopSegment: true,
  }) : "";
  const youtubeUrl = youtubeBase ? new URL(youtubeBase) : null;
  youtubeUrl?.searchParams.set("autoplay", "0");
  youtubeUrl?.searchParams.set("enablejsapi", "1");
  youtubeUrl?.searchParams.set("mute", "1");
  return <div className="relative h-full w-full overflow-hidden bg-black">
    {embedded && !preview ? <TrainerYouTube exercise={exercise} playing={Boolean(playing)} onMediaPlayingChange={onMediaPlayingChange} onError={() => { setError(true); onPlayingChange?.(false); }} /> : embedded ? <iframe title={`${exercise.name} demonstration`} src={youtubeUrl?.href}
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading={preview ? "lazy" : "eager"}
      className={exercise.videoLayout === "CENTER_CROP" ? "absolute left-1/2 top-0 h-full w-[316%] max-w-none -translate-x-1/2" : "h-full w-full"} />
      : <video ref={video} src={exercise.videoUrl} controls={preview} muted playsInline loop preload="metadata"
        className={`h-full w-full ${exercise.videoLayout === "CENTER_CROP" ? "object-cover" : "object-contain"}`}
        aria-label={`${exercise.name} demonstration`} onError={() => { setError(true); onPlayingChange?.(false); }}
        onPlaying={() => onMediaPlayingChange?.(true)} onPause={() => onMediaPlayingChange?.(false)} onWaiting={() => onMediaPlayingChange?.(false)}
        onLoadedMetadata={(event) => { event.currentTarget.currentTime = exercise.videoStartSeconds; }}
        onTimeUpdate={(event) => {
          if (event.currentTarget.currentTime < exercise.videoStartSeconds || (exercise.videoEndSeconds && event.currentTarget.currentTime >= exercise.videoEndSeconds)) event.currentTarget.currentTime = exercise.videoStartSeconds;
        }} />}
    {error && <p role="alert" className="absolute inset-0 flex items-center justify-center bg-black/90 p-6 text-center text-sm text-white/75">This video could not load. Try again or ask your trainer to check the video link.</p>}
  </div>;
}
