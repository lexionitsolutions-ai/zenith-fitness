import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getNextIndiaMidnight, getZeeBusinessDate, getZeeLine, getZeeProgress, zeeDailyLines, zeeStages, zeeStarterLines, zeeWarningLines } from "./zee";

describe("Zee progression", () => {
  it("ships a WebP asset for every evolution stage", () => {
    for (const stage of zeeStages) {
      const image = readFileSync(resolve(process.cwd(), "public", stage.image.slice(1)));
      expect(image.toString("ascii", 8, 12)).toBe("WEBP");
    }
  });
  it.each(zeeStages)("unlocks $name at day $days, never early", stage => {
    expect(getZeeProgress(stage.days).stage).toEqual(stage);
    if (stage.days > 0) expect(getZeeProgress(stage.days - 1).stage.days).toBeLessThan(stage.days);
  });
  it("keeps the highest reached stage between milestones", () => {
    for (let day = 0; day <= 110; day++) {
      const progress = getZeeProgress(day);
      expect(progress.stage.days).toBeLessThanOrEqual(day);
      if (progress.next) {
        expect(progress.next.days).toBeGreaterThan(day);
        expect(progress.remaining).toBe(progress.next.days - day);
      }
    }
  });
  it("relocks all future stages when a streak resets", () => {
    expect(getZeeProgress(100).index).toBe(19);
    expect(getZeeProgress(0)).toMatchObject({ index: 0, remaining: 1, stage: { days: 0 } });
    expect(zeeStages.filter(stage => stage.days <= getZeeProgress(0).days)).toHaveLength(1);
  });
  it("retains legendary Zee beyond day 100 and handles invalid inputs", () => {
    expect(getZeeProgress(999)).toMatchObject({ index: 19, next: null, remaining: 0 });
    for (const value of [-1, NaN, Infinity]) expect(getZeeProgress(value).stage.days).toBe(0);
  });
});

describe("Zee daily Hinglish", () => {
  it("has the agreed copy banks without duplicate lines", () => {
    expect(zeeDailyLines).toHaveLength(30);
    expect(zeeStarterLines).toHaveLength(7);
    expect(zeeWarningLines).toHaveLength(7);
    expect(new Set([...zeeDailyLines, ...zeeStarterLines, ...zeeWarningLines]).size).toBe(44);
  });
  it("rotates at India midnight regardless of the device timezone", () => {
    const before = new Date("2026-10-16T18:29:59.999Z");
    const after = new Date("2026-10-16T18:30:00.000Z");
    expect(getZeeBusinessDate(before)).toBe("2026-10-16");
    expect(getZeeBusinessDate(after)).toBe("2026-10-17");
    expect(getNextIndiaMidnight(before)).toEqual(after);
    expect(getNextIndiaMidnight(after)).toEqual(new Date("2026-10-17T18:30:00.000Z"));
    expect(getZeeLine(10, getZeeBusinessDate(before))).not.toBe(getZeeLine(10, getZeeBusinessDate(after)));
  });
  it("is stable across screens, refreshes and streak increases on the same day", () => {
    expect(getZeeLine(10, "2026-10-16")).toBe(getZeeLine(11, "2026-10-16"));
    expect(getZeeLine(10, "2026-10-16")).toBe(getZeeLine(10, "2026-10-16"));
  });
  it("uses supportive zero-day lines and clear near-expiry scan reminders", () => {
    expect(zeeStarterLines).toContain(getZeeLine(0, "2026-10-16", true));
    expect(zeeWarningLines).toContain(getZeeLine(16, "2026-10-16", true));
    expect(getZeeLine(16, "2026-10-16", true).toLowerCase()).toContain("scan");
  });
});
