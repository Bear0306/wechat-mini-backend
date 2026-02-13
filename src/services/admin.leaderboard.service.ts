import { prisma } from '../db';

export type RankRow = {
  rank: number;
  userId: number;
  name: string;
  steps: number;
  avatar?: string | null;
  abnormal?: boolean;
};

/** Get top N + trailing users for a contest. Marks abnormal data (e.g. very high steps). */
export async function getContestRanking(contestId: number, topN = 10, tailCount = 5) {
  const contest = await prisma.contest.findUnique({ where: { id: contestId } });
  if (!contest) return null;

  const entries = await prisma.contestEntry.findMany({
    where: { contestId },
    include: { user: { select: { id: true, wechatNick: true, avatarUrl: true } } },
    orderBy: [{ steps: 'desc' }, { submittedAt: 'asc' }],
  });

  const topSlice = entries.slice(0, topN);
  const tailSlice = entries.slice(-tailCount);

  // Simple heuristic for abnormal: steps > 100k or > 3x median of top N
  const topSteps = topSlice.map((e) => e.steps).filter(Boolean);
  const median = topSteps.length
    ? [...topSteps].sort((a, b) => a - b)[Math.floor(topSteps.length / 2)] ?? 0
    : 0;
  const threshold = Math.max(100_000, median * 3);

  const toRow = (e: (typeof entries)[0], rank: number): RankRow => {
    const steps = e.steps ?? 0;
    return {
      rank,
      userId: e.userId,
      name: e.user.wechatNick || ``,
      steps,
      avatar: e.user.avatarUrl || '',
      abnormal: steps >= threshold,
    };
  };

  const topRows = topSlice.map((e, i) => toRow(e, i + 1));
  const baseTailRank = entries.length - tailSlice.length + 1;
  const tailRows = tailSlice.map((e, i) => toRow(e, baseTailRank + i));

  return {
    contestId,
    contestTitle: contest.title,
    totalEntries: entries.length,
    top: topRows,
    tail: tailRows,
  };
}
