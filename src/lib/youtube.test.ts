import { describe, expect, it } from "vitest";
import { parseYouTubeId, youtubeEmbedUrl, youtubeThumbnailUrl } from "./youtube";

describe("youtube utilities", () => {
  it("parses approved YouTube URL shapes", () => {
    expect(parseYouTubeId("Qu7-ceCvq7w")).toBe("Qu7-ceCvq7w");
    expect(parseYouTubeId("https://www.youtube.com/watch?v=Qu7-ceCvq7w")).toBe("Qu7-ceCvq7w");
    expect(parseYouTubeId("https://youtu.be/Qu7-ceCvq7w")).toBe("Qu7-ceCvq7w");
    expect(parseYouTubeId("https://www.youtube.com/embed/Qu7-ceCvq7w")).toBe("Qu7-ceCvq7w");
    expect(parseYouTubeId("https://www.youtube-nocookie.com/embed/Qu7-ceCvq7w")).toBe("Qu7-ceCvq7w");
  });

  it("rejects unsupported hosts and malformed IDs", () => {
    expect(parseYouTubeId("https://example.com/embed/Qu7-ceCvq7w")).toBeNull();
    expect(parseYouTubeId("https://youtube.com/watch?v=short")).toBeNull();
    expect(parseYouTubeId("<iframe src=\"https://www.youtube.com/embed/Qu7-ceCvq7w\"></iframe>")).toBeNull();
  });

  it("generates privacy-enhanced embed and thumbnail URLs", () => {
    expect(youtubeEmbedUrl("Qu7-ceCvq7w")).toBe("https://www.youtube-nocookie.com/embed/Qu7-ceCvq7w?rel=0&modestbranding=1");
    expect(youtubeThumbnailUrl("Qu7-ceCvq7w")).toBe("https://i.ytimg.com/vi/Qu7-ceCvq7w/hqdefault.jpg");
    expect(() => youtubeEmbedUrl("bad")).toThrow("Invalid YouTube video ID");
  });
});
