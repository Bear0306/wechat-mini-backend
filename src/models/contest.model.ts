import { prisma } from '../db';
import { ContestStatus } from '@prisma/client';
import { nowInTz } from '../utils/time';


export async function getUpcomingContestIds() {
  const now = nowInTz().toJSDate();
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
  const now = nowInTz().toJSDate();
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

  // 3️⃣ FINALIZING → FINALIZED is done in contest.service after leaderboard finalize (see updateContestStatus)
}

/** Contest IDs that are FINALIZING and endAt was more than 24h ago (ready to finalize leaderboard then set FINALIZED). */
export async function getContestIdsToFinalize(): Promise<number[]> {
  const now = nowInTz().toJSDate();
  const finalizedBefore = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const rows = await prisma.contest.findMany({
    where: {
      status: ContestStatus.FINALIZING,
      endAt: { lt: finalizedBefore },
    },
    select: { id: true },
  });
  return rows.map((r: { id: number }) => r.id);
}

export async function updateStatusToFinalized(contestIds: number[]) {
  if (contestIds.length === 0) return;
  await prisma.contest.updateMany({
    where: { id: { in: contestIds } },
    data: { status: ContestStatus.FINALIZED },
  });
}

export function findEndedContestsWithEntries(userId: number) {
  return prisma.contest.findMany({
    where: {
      status: { in: [ContestStatus.FINALIZED, ContestStatus.FINALIZING] },
    },
    orderBy: { endAt: "desc" },
    select: {
      id: true,
      title: true,
      startAt: true,
      endAt: true,
      rewardTopN: true,
      status: true,

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