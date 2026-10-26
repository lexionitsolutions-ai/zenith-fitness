import { getStreakAward } from "./streak-awards";
import { getZeeLine, getZeeProgress } from "./zee";

export type StreakStoryData = { name: string; streak: number; businessDate: string };

/** Render the preview and shared file from the same 9:16 canvas. */
export async function createStreakStory({ name, streak, businessDate }: StreakStoryData): Promise<Blob> {
  const progress = getZeeProgress(streak);
  const zee = new Image();
  zee.src = progress.stage.image;
  await zee.decode();
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Story images are unavailable on this device.");

  const panel = (x: number, y: number, w: number, h: number, r: number, fill: string) => {
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill();
  };
  const text = (value: string, y: number, size: number, color: string, weight = 700, maxWidth = 880) => {
    ctx.font = `${weight} ${size}px Arial, sans-serif`;
    while (ctx.measureText(value).width > maxWidth && size > 14) {
      size -= 1; ctx.font = `${weight} ${size}px Arial, sans-serif`;
    }
    ctx.fillStyle = color; ctx.fillText(value, 540, y);
  };
  const gradient = ctx.createLinearGradient(0, 0, 1080, 1920);
  gradient.addColorStop(0, "#192e27"); gradient.addColorStop(0.55, "#0c1b18"); gradient.addColorStop(1, "#060e0c");
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 1080, 1920);
  const glow = ctx.createRadialGradient(540, 1050, 0, 540, 1050, 650);
  glow.addColorStop(0, "#b7a05a40"); glow.addColorStop(1, "#b7a05a00");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, 1080, 1920);
  ctx.strokeStyle = "#f5d78426"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(48, 80, 984, 1760, 48); ctx.stroke();
  ctx.textAlign = "center";
  text("Z E N I T H", 235, 40, "#f8e4a6", 900);
  text("THE SHOWING UP CLUB", 284, 19, "#8ca298", 600);
  panel(326, 338, 428, 62, 31, "#f5d78416");
  text(progress.days > 0 ? "CONSISTENCY LOOKS GOOD ON ME" : "MY COMEBACK STARTS HERE", 378, 19, "#f8e4a6");
  text(name.trim() || "Zenith member", 481, 60, "#fff9e9", 900);
  text("is showing up for greatness.", 530, 27, "#a8b8ad", 400);
  text(String(progress.days), 785, 230, "#f8e4a6", 900, 850);
  text(`DAY${progress.days === 1 ? "" : "S"} GYM STREAK`, 847, 34, "#fff9e9", 900);
  text(getStreakAward(progress.days).label.toUpperCase(), 903, 23, "#b5c4b8");

  // Contain the original artwork so every evolution retains its full silhouette.
  const scale = Math.min(650 / zee.naturalWidth, 530 / zee.naturalHeight);
  const width = zee.naturalWidth * scale; const height = zee.naturalHeight * scale;
  ctx.drawImage(zee, 540 - width / 2, 940 + (530 - height) / 2, width, height);
  panel(330, 1478, 420, 50, 25, "#f5d78414");
  text(`ZEE / ${progress.stage.name.toUpperCase()}`, 1510, 19, "#f8e4a6", 700, 380);

  panel(110, 1560, 860, 172, 28, "#ffffff08");
  text("A LITTLE MOTIVATION FROM ZEE", 1600, 17, "#cbbb89");
  const quote = `“${getZeeLine(progress.days, businessDate)}”`;
  ctx.font = "600 30px Arial, sans-serif";
  const lines: string[] = []; let line = "";
  for (const word of quote.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > 744 && line) { lines.push(line); line = word; }
    else line = next;
  }
  if (line) lines.push(line);
  lines.forEach((value, index) => text(value, 1650 + index * 40, 30, "#fff9e9", 600, 744));
  text("TINY PAWS. BIG STREAKS.", 1792, 20, "#8ca298");
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Couldn't create your story. Please try again.")), "image/png"));
}
