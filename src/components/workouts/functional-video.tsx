"use client";

import { useEffect, useRef, useState } from "react";
import { youtubeEmbedUrl } from "@/lib/youtube";

export type FunctionalVideoSource = {
  name: string; videoUrl: string; youtubeVideoId: string | null;
  videoStartSeconds: number; videoEndSeconds: number | null; videoLayout: string;
};

export function FunctionalVideo({ exercise, playing, onPlayingChange, preview = false }: {
  exercise: FunctionalVideoSource; playing?: boolean; onPlayingChange?: (playing: boolean) => void; preview?: boolean;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [error, setError] = useState(false);
  const embedded = Boolean(exercise.youtubeVideoId && /^https:\/\/(www\.)?youtube(-nocookie)?\.com\/embed\//.test(exercise.videoUrl));
  useEffect(() => {
    if (preview) return;
    if (embedded) {
      frame.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func: playing ? "playVideo" : "pauseVideo", args: [] }), "https://www.youtube-nocookie.com");
      return;
    }
    if (!video.current) return;
    if (playing) video.current.play().catch(() => onPlayingChange?.(false));
    else video.current.pause();
  }, [playing, exercise.videoUrl, embedded, preview, onPlayingChange]);
  const youtubeBase = exercise.youtubeVideoId ? youtubeEmbedUrl(exercise.youtubeVideoId, {
    startSeconds: exercise.videoStartSeconds, endSeconds: exercise.videoEndSeconds, loopSegment: true,
  }) : "";
  const youtubeUrl = youtubeBase ? new URL(youtubeBase) : null;
  youtubeUrl?.searchParams.set("autoplay", "0");
  youtubeUrl?.searchParams.set("enablejsapi", "1");
  youtubeUrl?.searchParams.set("mute", "1");
  return <div className="relative h-full w-full overflow-hidden bg-black">
    {embedded ? <iframe ref={frame} title={`${exercise.name} demonstration`} src={youtubeUrl?.href}
      onLoad={() => { if (playing && !preview) frame.current?.contentWindow?.postMessage(JSON.stringify({ event: "command", func: "playVideo", args: [] }), "https://www.youtube-nocookie.com"); }}
      allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading={preview ? "lazy" : "eager"}
      className={exercise.videoLayout === "CENTER_CROP" ? "absolute left-1/2 top-0 h-full w-[316%] max-w-none -translate-x-1/2" : "h-full w-full"} />
      : <video ref={video} src={exercise.videoUrl} controls={preview} muted playsInline loop preload="metadata"
        className={`h-full w-full ${exercise.videoLayout === "CENTER_CROP" ? "object-cover" : "object-contain"}`}
        aria-label={`${exercise.name} demonstration`} onError={() => { setError(true); onPlayingChange?.(false); }}
        onLoadedMetadata={(event) => { event.currentTarget.currentTime = exercise.videoStartSeconds; }}
        onTimeUpdate={(event) => {
          if (event.currentTarget.currentTime < exercise.videoStartSeconds || (exercise.videoEndSeconds && event.currentTarget.currentTime >= exercise.videoEndSeconds)) event.currentTarget.currentTime = exercise.videoStartSeconds;
        }} />}
    {error && <p role="alert" className="absolute inset-0 flex items-center justify-center bg-black/90 p-6 text-center text-sm text-white/75">This video could not load. Try again or ask your trainer to check the video link.</p>}
  </div>;
}
