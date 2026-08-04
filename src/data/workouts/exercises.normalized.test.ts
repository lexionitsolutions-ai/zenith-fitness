import { describe, expect, it } from "vitest";
import dataset from "./exercises.normalized.json";

describe("normalized workout exercise dataset", () => {
  it("contains exercise IDs 1 through 122 exactly once", () => {
    const ids = dataset.exercises.map((exercise) => exercise.id);
    expect(ids).toHaveLength(122);
    expect(new Set(ids).size).toBe(122);
    expect([...ids].sort((a, b) => a - b)).toEqual(Array.from({ length: 122 }, (_, index) => index + 1));
  });

  it("uses privacy-enhanced YouTube embeds with matching video IDs", () => {
    for (const exercise of dataset.exercises) {
      if (exercise.video) {
        expect(exercise.video.embedUrl).toContain("youtube-nocookie.com");
        expect(exercise.video.embedUrl).toContain(exercise.video.youtubeId);
      }
      for (const candidate of exercise.candidates) {
        expect(candidate.embedUrl).toContain("youtube-nocookie.com");
        expect(candidate.embedUrl).toContain(candidate.youtubeId);
      }
    }
  });

  it("preserves owner-confirmation records without primary videos", () => {
    const needsConfirmation = dataset.exercises.filter((exercise) => exercise.status === "NEEDS_OWNER_CONFIRMATION");
    expect(needsConfirmation).toHaveLength(15);
    expect(needsConfirmation.every((exercise) => exercise.video === null)).toBe(true);
  });
});
