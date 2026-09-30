import { prisma } from "@/lib/database/prisma";

function indiaDateParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}

function monthDayKey(month: number, day: number) {
  return `${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function indiaWindowBirthdayKeys(now: Date) {
  const today = indiaDateParts(now);
  return new Set(
    [-1, 0, 1].map((offset) => {
      const date = new Date(Date.UTC(today.year, today.month - 1, today.day + offset));
      return monthDayKey(date.getUTCMonth() + 1, date.getUTCDate());
    }),
  );
}

function birthdayKey(birthDate: Date) {
  return monthDayKey(birthDate.getUTCMonth() + 1, birthDate.getUTCDate());
}

function birthdayLabel(birthDate: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
  }).format(birthDate);
}

export async function getBirthdayAnnouncementMembers(now = new Date()) {
  const birthdayKeys = indiaWindowBirthdayKeys(now);
  const members = await prisma.member.findMany({
    where: { birthDate: { not: null } },
    select: {
      id: true,
      fullName: true,
      admissionId: true,
      mobileNumber: true,
      birthDate: true,
    },
    orderBy: { fullName: "asc" },
  });

  return members
    .filter((member) => {
      const birthDate = member.birthDate!;
      return birthdayKeys.has(birthdayKey(birthDate));
    })
    .map(({ birthDate, ...member }) => ({
      ...member,
      birthDate: birthdayLabel(birthDate!),
    }));
}

export const getTodaysBirthdays = getBirthdayAnnouncementMembers;
