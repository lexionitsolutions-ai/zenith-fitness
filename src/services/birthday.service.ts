import { prisma } from "@/lib/database/prisma";

function indiaDateParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  return {
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}

export async function getTodaysBirthdays(now = new Date()) {
  const today = indiaDateParts(now);
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
      return birthDate.getUTCMonth() + 1 === today.month && birthDate.getUTCDate() === today.day;
    })
    .map(({ birthDate: _birthDate, ...member }) => member);
}
