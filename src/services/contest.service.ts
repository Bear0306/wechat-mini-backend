import { ContestStatus } from '@prisma/client';
import { formatCnRange, nowInTz } from '../utils/time';
import * as ContestentryModel from '../models/contestentry.model';
import * as ContestModel from '../models/contest.model';
import * as LeaderboardService from './leaderboard.service';
import { decUserJoinCount } from './user.service';


export async function getUserContestList( userId: number, limit: number | null = 3) {

  const joinedIds = await ContestentryModel.getJoinedContestIds(userId);
  const upcomingIds = await ContestModel.getUpcomingContestIds();
  const allContestIds = Array.from(new Set([...joinedIds, ...upcomingIds]));

  if (allContestIds.length === 0) return [];

  const contests = await ContestModel.fetchContestRows(allContestIds, limit);
  
  return contests.map((c: typeof contests[number]) => ({
    ...c,
    joined: joinedIds.includes(c.id),
  }));
}

export async function getUserRecentContests(userId: number) {
  return getUserContestList(userId, 3);
}

export async function participateContest(userId: number, contestId: number) { 
  const contest = await ContestModel.fetchContestById(contestId);
  if (!contest) throw { status: 404, message: '赛事不存在' };

  const now = nowInTz().toJSDate();

  // 仅允许“未开始”报名：UI 对应“未开始=显示 参与挑战”
  const notStartedYet = now < contest.startAt;
  if (!notStartedYet) {
    if (now > contest.endAt || contest.status === ContestStatus.FINALIZED) {
      throw { status: 409, message: '赛事已结束，仅可查看排名' };
    }
    throw { status: 409, message: '赛事已开始，仅可查看排名' };
  }

  // 报名（若已存在则复用）
  const entry = await ContestentryModel.upsertContestEntry(userId, contestId);

  await decUserJoinCount(userId);

  return { entryId: entry.id, contestId: entry.contestId };
}

export async function getEndedContestList( userId: number, page: number, size: number ) {
  const contests = await ContestModel.findEndedContestsWithEntries(userId);

  const itemsAll = contests.map(c => {
    const myEntry = c.entries.find(e => e.userId === userId);

    let myRank: number | null = null;
    let canClaim = false;
    let claimed = c.prizeClaims.length > 0;
    const claimId = c.prizeClaims.length > 0 ? c.prizeClaims[0].id : null;

    if (myEntry) {
      const betterCount = c.entries.filter(
        e => e.steps > myEntry.steps
      ).length;

      myRank = betterCount + 1;
      canClaim = myRank <= c.rewardTopN && !claimed;
    }

    return {
      contestId: c.id,
      title: c.title,
      dateText: formatCnRange(c.startAt, c.endAt),
      rewardTopN: c.rewardTopN,
      myRank,
      canClaim,
      claimed,
      claimId,
      participated: !!myEntry,
      status: c.status,
    };
  });

  // participated contests first
  const sorted = itemsAll.sort((a, b) => {
    return Number(b.participated) - Number(a.participated);
  });

  const start = (page - 1) * size;
  const pageItems = sorted.slice(start, start + size);

  return {
    items: pageItems,
    hasMore: start + size < sorted.length,
  };
}

export async function updateContestStatus() {
  const now = nowInTz().toJSDate();
  console.log('Contest status updating started...', now);
  await ContestModel.updateStatus();

  // When FINALIZING → FINALIZED: finalize leaderboard (rank) for each, then set status FINALIZED
  const idsToFinalize = await ContestModel.getContestIdsToFinalize();
  for (const contestId of idsToFinalize) {
    try {
      const r = await LeaderboardService.finalize(contestId);
      if (r.ok) {
        await ContestModel.updateStatusToFinalized([contestId]);
        console.log('Contest finalized (leaderboard ranked):', contestId);
      }
    } catch (e: any) {
      console.error('Finalize leaderboard failed for contest', contestId, e?.message || e);
    }
  }
  console.log('Contest status updated:', now);
}