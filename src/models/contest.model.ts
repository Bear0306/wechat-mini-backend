import { prisma } from '../db';
import { ContestStatus } from '@prisma/client';


export async function getUpcomingContestIds() {
  const now = new Date();
  const upcoming = await prisma.contest.findMany({
    where: { startAt: { gt: now } },
    select: { id: true },
    orderBy: { startAt: 'asc' },
  });
  const upcomingIds = upcoming.map((r: { id: number }) => r.id);
  return upcomingIds;
}

export async function getOngoingContestEntries() {
  const contests = await prisma.contest.findMany({
    where: { status: 'ONGOING' },
    select: {
      id: true,
      startAt: true,
      endAt: true,
      entries: {
        select: {
          id: true,
          userId: true,
          contestId: true,
        },
      },
    },
  });

  return contests;

}

export async function fetchContestRows(allContestIds: Array<number>, limit: number | null = 3) {
  const contests = await prisma.contest.findMany({
    where: { id: { in: allContestIds } },
    orderBy: { startAt: 'desc' },
    ...(limit && limit > 0 ? { take: limit } : {}), // skip `take` if unlimited
  });

  return contests;
}

export async function fetchContestById(contestId: number) {
  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    select: { id: true, startAt: true, endAt: true, status: true },
  });
  return contest
}

export async function updateStatus() {

  const now = new Date();
  await prisma.contest.updateMany({
    where: {
      startAt: { lte: now },
      endAt: { gte: now },
    },
    data: {
      status: ContestStatus.ONGOING,
    },
  });

  // 2️⃣ ONGOING → FINALIZING
  await prisma.contest.updateMany({
    where: {
      endAt: { lt: now },
    },
    data: {
      status: ContestStatus.FINALIZING,
    },
  });

  // 3️⃣ FINALIZING → FINALIZED (endAt + 24h)
  const finalizedBefore = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  await prisma.contest.updateMany({
    where: {
      endAt: { lt: finalizedBefore },
    },
    data: { status: ContestStatus.FINALIZED },
  });

}

export function findEndedContestsWithEntries(userId: number) {
  return prisma.contest.findMany({
    where: {
      status: ContestStatus.FINALIZED,
    },
    orderBy: { endAt: "desc" },
    select: {
      id: true,
      title: true,
      startAt: true,
      endAt: true,
      rewardTopN: true,

      // 🔗 relation: all entries of this contest
      entries: {
        select: {
          userId: true,
          steps: true,
        },
      },

      // 🔗 relation: prize claims (only for this user)
      prizeClaims: {
        where: { userId },
        select: { id: true },
      },
    },
  });
}