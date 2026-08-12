import { prisma } from "@/lib/database/prisma";
import { BATCH_SCHEDULE, type BatchSession } from "@/constants/batch-schedule";

const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function toSession(row: { day: number; time: string; name: string }): BatchSession {
  const [hour, minute] = row.time.split(":").map(Number);
  return { day: row.day, dayName: days[row.day], time: row.time, hour, minute, name: row.name };
}

const indiaParts = (d: Date) => {
  const p = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", weekday: "short", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d);
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return { year: +get("year"), month: +get("month"), date: +get("day"), hour: +get("hour"), minute: +get("minute"), weekday: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday")) };
};

export async function getScheduleSessions() {
  const rows = await prisma.scheduleSession.findMany({ where: { isActive: true }, orderBy: [{ day: "asc" }, { time: "asc" }] });
  return rows.length ? rows.map(toSession) : BATCH_SCHEDULE;
}

export function getNextScheduleSession(schedule: BatchSession[], now = new Date()) {
  const local = indiaParts(now);
  for (let offset = 0; offset < 8; offset++) {
    const targetDay = (local.weekday + offset) % 7;
    for (const batch of schedule.filter((x) => x.day === targetDay)) {
      if (offset === 0 && (batch.hour < local.hour || (batch.hour === local.hour && batch.minute <= local.minute))) continue;
      const localMidnight = new Date(Date.UTC(local.year, local.month - 1, local.date + offset));
      const startsAt = new Date(Date.UTC(localMidnight.getUTCFullYear(), localMidnight.getUTCMonth(), localMidnight.getUTCDate(), batch.hour - 5, batch.minute - 30));
      return { ...batch, startsAt };
    }
  }
  throw new Error("Batch schedule is empty");
}
