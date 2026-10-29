import { Prisma, TargetStatus } from "@prisma/client";
import { prisma } from "@/lib/database/prisma";
import { AppError } from "@/lib/errors";
import { hasActiveMembership, indiaBusinessDate } from "@/lib/utils/point-rules";
import { getZeeBusinessDate } from "@/lib/utils/zee";
import { normalizeAdmissionId } from "@/lib/utils/normalization";
import { appDatabaseObject } from "@/lib/database/app-object";
import { authoritativeMemberships } from "@/lib/utils/management-memberships";

export { indiaBusinessDate };

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

const STREAK_GRACE_WINDOW_MS = 42 * 60 * 60 * 1000;
const STREAK_EXPIRING_SOON_MS = 4 * 60 * 60 * 1000;

function startOfIndiaMonth(now = new Date()) {
  const today = indiaBusinessDate(now);
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
}

function startOfNextMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

export type DailyVisitStreakStatus = {
  currentStreak: number;
  streakExpiresAt: string | null;
  streakExpiresSoon: boolean;
};

export function calculateDailyVisitStreakStatus(
  visits: { businessDate: Date; createdAt: Date }[],
  now = new Date()
): DailyVisitStreakStatus {
  const latestVisit = visits[0];
  if (!latestVisit) return { currentStreak: 0, streakExpiresAt: null, streakExpiresSoon: false };

  const expiresAt = new Date(latestVisit.createdAt.getTime() + STREAK_GRACE_WINDOW_MS);
  if (now > expiresAt) return { currentStreak: 0, streakExpiresAt: expiresAt.toISOString(), streakExpiresSoon: false };

  const visited = new Set(visits.map((visit) => visit.businessDate.toISOString().slice(0, 10)));
  let cursor = latestVisit.businessDate;
  let streak = 0;
  while (visited.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  const remainingMs = expiresAt.getTime() - now.getTime();
  return {
    currentStreak: streak,
    streakExpiresAt: expiresAt.toISOString(),
    streakExpiresSoon: remainingMs <= STREAK_EXPIRING_SOON_MS,
  };
}

export async function getDailyVisitStreakStatus(memberId: string, now = new Date()) {
  const today = indiaBusinessDate(now);
  const visits = await prisma.pointTransaction.findMany({
    where: { memberId, transactionType: "DAILY_VISIT", businessDate: { lte: today } },
    distinct: ["businessDate"],
    orderBy: [{ businessDate: "desc" }, { createdAt: "desc" }],
    select: { businessDate: true, createdAt: true },
    take: 370,
  });
  return calculateDailyVisitStreakStatus(visits, now);
}

export async function getCurrentDailyVisitStreak(memberId: string, now = new Date()) {
  return (await getDailyVisitStreakStatus(memberId, now)).currentStreak;
}

export async function awardDailyVisit(qrToken: string, staffUserId: string) {
  const primary = await prisma.member.findUnique({ where: { qrToken }, include: { memberships: true } });
  const member = primary ?? (await prisma.appQrAlias.findUnique({ where: { token: qrToken }, include: { member: { include: { memberships: true } } } }))?.member;
  if (!member || !member.qrCodeActive) throw new AppError("INVALID_QR", "Member QR code is invalid.", 404);
  if (!hasActiveMembership(authoritativeMemberships(member))) throw new AppError("MEMBERSHIP_INACTIVE", "Daily points are unavailable because this membership is expired or not yet active.", 409);

  const date = indiaBusinessDate();
  const key = `daily:${member.id}:${date.toISOString().slice(0, 10)}`;
  try {
    const transaction = await prisma.pointTransaction.create({
      data: {
        memberId: member.id,
        points: 5,
        transactionType: "DAILY_VISIT",
        referenceKey: key,
        description: "Daily gym visit",
        awardedByUserId: staffUserId,
        businessDate: date,
      },
    });
    return { member: { admissionId: member.admissionId, name: member.fullName }, transaction, alreadyAwarded: false };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { member: { admissionId: member.admissionId, name: member.fullName }, transaction: null, alreadyAwarded: true };
    }
    throw error;
  }
}

export async function findMemberForDailyVisit(input: string) {
  const value = input.trim();
  if (!value) throw new AppError("SEARCH_REQUIRED", "Enter QR token, Admission ID, or mobile number.");

  const digits = value.replace(/\D/g, "");
  const normalizedAdmissionId = normalizeAdmissionId(value);
  const admissionId =
    normalizedAdmissionId && /^\d+$/.test(normalizedAdmissionId)
      ? `ZF-${normalizedAdmissionId}`
      : normalizedAdmissionId?.replace(/^ZF-?(\d+)$/, "ZF-$1");
  const isQrToken = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

  const member = await prisma.member.findFirst({
    where: {
      OR: [
        isQrToken ? { qrToken: value } : undefined,
        admissionId ? { admissionId } : undefined,
        digits.length >= 10 ? { mobileNumber: { endsWith: digits.slice(-10) } } : undefined,
      ].filter(Boolean) as { qrToken?: string; admissionId?: string; mobileNumber?: { endsWith: string } }[],
    },
    select: { qrToken: true, admissionId: true, fullName: true, qrCodeActive: true },
  });
  if (!member || !member.qrCodeActive) throw new AppError("MEMBER_NOT_FOUND", "Member not found or QR is inactive.", 404);
  return { qrToken: member.qrToken, admissionId: member.admissionId, name: member.fullName };
}

type PointsRanking = { memberId: string; fullName: string; admissionId: string; totalPoints: bigint; monthlyPoints: bigint; monthlyVisits: bigint };

async function memberRankings(now: Date) {
  const monthStart = startOfIndiaMonth(now);
  const nextMonthStart = startOfNextMonth(monthStart);
  // One grouped read replaces two ranking queries, member-name lookup and
  // member-balance aggregation. Dates stay bound, and every table is qualified.
  return prisma.$queryRaw<PointsRanking[]>`
    SELECT p."memberId", m."fullName", m."admissionId",
      SUM(p.points)::bigint AS "totalPoints",
      COALESCE(SUM(p.points) FILTER (WHERE p."transactionType" = 'DAILY_VISIT'
        AND p."businessDate" >= ${monthStart}::date AND p."businessDate" < ${nextMonthStart}::date), 0)::bigint AS "monthlyPoints",
      COUNT(*) FILTER (WHERE p."transactionType" = 'DAILY_VISIT'
        AND p."businessDate" >= ${monthStart}::date AND p."businessDate" < ${nextMonthStart}::date) AS "monthlyVisits"
    FROM ${appDatabaseObject("PointTransaction")} AS p
    JOIN ${appDatabaseObject("Member")} AS m ON m.id = p."memberId"
    GROUP BY p."memberId", m."fullName", m."admissionId"
    ORDER BY "totalPoints" DESC, p."memberId" ASC
  `;
}

export async function getMemberPoints(memberId: string, now = new Date()) {
  const [member, transactions, targets, rankings, streakStatus] = await Promise.all([
    prisma.member.findUnique({ where: { id: memberId }, select: { qrToken: true, admissionId: true, fullName: true } }),
    prisma.pointTransaction.findMany({ where: { memberId }, orderBy: { createdAt: "desc" }, take: 30 }),
    prisma.memberTarget.findMany({ where: { memberId }, orderBy: { createdAt: "desc" } }),
    memberRankings(now),
    getDailyVisitStreakStatus(memberId, now),
  ]);
  if (!member) throw new AppError("MEMBER_NOT_FOUND", "Member not found.", 404);
  const memberRankIndex = rankings.findIndex(row => row.memberId === memberId);
  const currentMemberRank = memberRankIndex >= 0 ? memberRankIndex + 1 : null;
  const pointsBalance = memberRankIndex >= 0 ? Number(rankings[memberRankIndex].totalPoints) : 0;
  const monthlyLeaders = rankings.filter(row => Number(row.monthlyVisits) > 0).sort((a, b) =>
    Number(b.monthlyPoints) - Number(a.monthlyPoints) || Number(b.monthlyVisits) - Number(a.monthlyVisits) || (a.memberId < b.memberId ? -1 : a.memberId > b.memberId ? 1 : 0));
  return {
    member,
    pointsBalance,
    currentMemberRank,
    streakBusinessDate: getZeeBusinessDate(now),
    currentStreak: streakStatus.currentStreak,
    streakExpiresAt: streakStatus.streakExpiresAt,
    streakExpiresSoon: streakStatus.streakExpiresSoon,
    transactions: transactions.map((transaction) => ({
      ...transaction,
      businessDate: transaction.businessDate.toISOString(),
      createdAt: transaction.createdAt.toISOString(),
    })),
    targets: targets.map((target) => ({
      ...target,
      targetValue: target.targetValue?.toNumber() ?? null,
      startDate: target.startDate.toISOString(),
      dueDate: target.dueDate.toISOString(),
      completedAt: target.completedAt?.toISOString() ?? null,
      createdAt: target.createdAt.toISOString(),
    })),
    leaderboard: rankings.map((row, index) => ({
      rank: index + 1,
      name: row.fullName.split(" ")[0],
      admissionId: `${row.admissionId.slice(0, 3)}***${row.admissionId.slice(-2)}`,
      points: Number(row.totalPoints),
      isCurrentMember: row.memberId === memberId,
    })),
    monthlyAchievers: monthlyLeaders.map((row, index) => ({
      rank: index + 1,
      name: row.fullName.split(" ")[0],
      admissionId: `${row.admissionId.slice(0, 3)}***${row.admissionId.slice(-2)}`,
      points: Number(row.monthlyPoints),
      visits: Number(row.monthlyVisits),
      isCurrentMember: row.memberId === memberId,
    })),
  };
}

export async function assignTarget(
  input: { memberId: string; title: string; description?: string; targetValue?: number; unit?: string; rewardPoints: number; startDate: Date; dueDate: Date },
  staffUserId: string
) {
  if (input.dueDate < input.startDate) throw new AppError("INVALID_TARGET_DATES", "Due date must be on or after start date.");
  return prisma.memberTarget.create({ data: { ...input, assignedByUserId: staffUserId } });
}

export async function completeTarget(targetId: string, staffUserId: string) {
  return prisma.$transaction(async (tx) => {
    const target = await tx.memberTarget.findUnique({ where: { id: targetId } });
    if (!target) throw new AppError("TARGET_NOT_FOUND", "Target not found.", 404);
    if (target.status === TargetStatus.COMPLETED) throw new AppError("TARGET_ALREADY_COMPLETED", "Target reward has already been awarded.", 409);

    const completed = await tx.memberTarget.update({
      where: { id: targetId },
      data: { status: "COMPLETED", completedAt: new Date(), completedByUserId: staffUserId },
    });
    await tx.pointTransaction.create({
      data: {
        memberId: target.memberId,
        points: target.rewardPoints,
        transactionType: "TARGET_COMPLETION",
        referenceKey: `target:${target.id}`,
        description: `Target completed: ${target.title}`,
        awardedByUserId: staffUserId,
        businessDate: indiaBusinessDate(),
      },
    });
    return completed;
  });
}

export async function reduceMemberPoints(memberId: string, actorUserId: string, action: "REDUCE" | "RESET", amount: number | undefined, reason: string) {
  return prisma.$transaction(
    async (tx) => {
      const member = await tx.member.findUnique({ where: { id: memberId }, select: { id: true, admissionId: true, fullName: true } });
      if (!member) throw new AppError("MEMBER_NOT_FOUND", "Member not found.", 404);

      const total = await tx.pointTransaction.aggregate({ where: { memberId }, _sum: { points: true } });
      const balance = Math.max(0, total._sum.points ?? 0);
      const deduction = action === "RESET" ? balance : Math.min(balance, Math.max(0, amount ?? 0));
      if (deduction <= 0) throw new AppError("NO_POINTS_TO_REDUCE", balance === 0 ? "Member balance is already zero." : "Enter a valid reduction amount.", 409);

      const transaction = await tx.pointTransaction.create({
        data: {
          memberId,
          points: -deduction,
          transactionType: "REVERSAL",
          description: `${action === "RESET" ? "Balance reset" : "Points reduced"}: ${reason}`,
          awardedByUserId: actorUserId,
          businessDate: indiaBusinessDate(),
        },
      });
      return { member, balanceBefore: balance, balanceAfter: balance - deduction, transaction };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );
}
