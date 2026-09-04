import { Prisma, TargetStatus } from "@prisma/client";
import { prisma } from "@/lib/database/prisma";
import { AppError } from "@/lib/errors";
import { hasActiveMembership, indiaBusinessDate } from "@/lib/utils/point-rules";

export { indiaBusinessDate };

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function startOfIndiaMonth(now = new Date()) {
  const today = indiaBusinessDate(now);
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
}

function startOfNextMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

export async function getCurrentDailyVisitStreak(memberId: string, now = new Date()) {
  const today = indiaBusinessDate(now);
  const visits = await prisma.pointTransaction.findMany({
    where: { memberId, transactionType: "DAILY_VISIT", businessDate: { lte: today } },
    distinct: ["businessDate"],
    orderBy: { businessDate: "desc" },
    select: { businessDate: true },
    take: 370,
  });
  const visited = new Set(visits.map((visit) => visit.businessDate.toISOString().slice(0, 10)));
  let cursor = today;
  let streak = 0;
  while (visited.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export async function awardDailyVisit(qrToken: string, staffUserId: string) {
  const member = await prisma.member.findUnique({ where: { qrToken }, include: { memberships: true } });
  if (!member || !member.qrCodeActive) throw new AppError("INVALID_QR", "Member QR code is invalid.", 404);
  if (!hasActiveMembership(member.memberships)) throw new AppError("MEMBERSHIP_INACTIVE", "Daily points are unavailable because this membership is expired or not yet active.", 409);

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

export async function getMemberPoints(memberId: string) {
  const member = await prisma.member.findUnique({ where: { id: memberId }, select: { qrToken: true, admissionId: true, fullName: true } });
  if (!member) throw new AppError("MEMBER_NOT_FOUND", "Member not found.", 404);

  const monthStart = startOfIndiaMonth();
  const nextMonthStart = startOfNextMonth(monthStart);
  const transactions = await prisma.pointTransaction.findMany({ where: { memberId }, orderBy: { createdAt: "desc" }, take: 30 });
  const targets = await prisma.memberTarget.findMany({ where: { memberId }, orderBy: { createdAt: "desc" } });
  const sums = await prisma.pointTransaction.aggregate({ where: { memberId }, _sum: { points: true } });
  const rankedMembers = await prisma.pointTransaction.groupBy({ by: ["memberId"], _sum: { points: true }, orderBy: { _sum: { points: "desc" } } });
  const leaders = rankedMembers.slice(0, 50);
  const memberRankIndex = rankedMembers.findIndex((leader) => leader.memberId === memberId);
  const currentMemberRank = memberRankIndex >= 0 ? memberRankIndex + 1 : null;
  const monthlyLeaders = await prisma.pointTransaction.groupBy({
    by: ["memberId"],
    where: { transactionType: "DAILY_VISIT", businessDate: { gte: monthStart, lt: nextMonthStart } },
    _sum: { points: true },
    _count: { id: true },
    orderBy: [{ _sum: { points: "desc" } }, { _count: { id: "desc" } }],
    take: 10,
  });
  const leaderMembers = await prisma.member.findMany({
    where: { id: { in: [...new Set([...leaders.map((leader) => leader.memberId), ...monthlyLeaders.map((leader) => leader.memberId)])] } },
    select: { id: true, fullName: true, admissionId: true },
  });
  const byId = new Map(leaderMembers.map((leaderMember) => [leaderMember.id, leaderMember]));
  const currentStreak = await getCurrentDailyVisitStreak(memberId);

  return {
    member,
    pointsBalance: sums._sum.points ?? 0,
    currentMemberRank,
    currentStreak,
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
    leaderboard: leaders.flatMap((leader, index) => {
      const leaderMember = byId.get(leader.memberId);
      if (!leaderMember) return [];
      return {
        rank: index + 1,
        name: leaderMember.fullName.split(" ")[0],
        admissionId: `${leaderMember.admissionId.slice(0, 3)}***${leaderMember.admissionId.slice(-2)}`,
        points: leader._sum.points ?? 0,
        isCurrentMember: leader.memberId === memberId,
      };
    }),
    monthlyAchievers: monthlyLeaders.flatMap((leader, index) => {
      const leaderMember = byId.get(leader.memberId);
      if (!leaderMember) return [];
      return {
        rank: index + 1,
        name: leaderMember.fullName.split(" ")[0],
        admissionId: `${leaderMember.admissionId.slice(0, 3)}***${leaderMember.admissionId.slice(-2)}`,
        points: leader._sum.points ?? 0,
        visits: leader._count.id,
        isCurrentMember: leader.memberId === memberId,
      };
    }),
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
