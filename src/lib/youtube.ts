const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

export function parseYouTubeId(input: string): string | null {
  const value = input.trim();
  if (YOUTUBE_ID.test(value)) return value;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    let id: string | null = null;
    if (host === "youtu.be") id = url.pathname.split("/").filter(Boolean)[0] ?? null;
    if (host === "youtube.com" || host === "m.youtube.com") {
      id = url.searchParams.get("v");
      if (!id && url.pathname.startsWith("/embed/")) id = url.pathname.split("/")[2] ?? null;
    }
    if (host === "youtube-nocookie.com" && url.pathname.startsWith("/embed/")) {
      id = url.pathname.split("/")[2] ?? null;
    }
    return id && YOUTUBE_ID.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function youtubeEmbedUrl(id: string, options?: { startSeconds?: number | null; endSeconds?: number | null; loopSegment?: boolean }): string {
  if (!YOUTUBE_ID.test(id)) throw new Error("Invalid YouTube video ID");
  const params = new URLSearchParams({ rel: "0", modestbranding: "1" });
  const startSeconds = options?.startSeconds;
  const endSeconds = options?.endSeconds;
  if (Number.isInteger(startSeconds) && startSeconds! >= 0) params.set("start", String(startSeconds));
  if (Number.isInteger(endSeconds) && endSeconds! > 0) params.set("end", String(endSeconds));
  if (options?.loopSegment) {
    params.set("loop", "1");
    params.set("playlist", id);
    params.set("autoplay", "1");
    params.set("mute", "1");
    params.set("playsinline", "1");
  }
  return `https://www.youtube-nocookie.com/embed/${id}?${params.toString()}`;
}

export function youtubeThumbnailUrl(id: string): string {
  if (!YOUTUBE_ID.test(id)) throw new Error("Invalid YouTube video ID");
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export function youtubeWatchUrl(id: string): string {
  if (!YOUTUBE_ID.test(id)) throw new Error("Invalid YouTube video ID");
  return `https://www.youtube.com/watch?v=${id}`;
}
