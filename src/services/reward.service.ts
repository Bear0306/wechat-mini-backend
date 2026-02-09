import { prisma } from '../db';
import { PrizeClaimStatus } from '@prisma/client';
import { nowInTz } from '../utils/time';

async function computeRank(contestId: number, userId: number) {
  const me = await prisma.contestEntry.findFirst({
    where: { contestId, userId },
    select: { steps: true },
  });
  if (!me) return { rank: null as number | null, steps: 0 };
  const better = await prisma.contestEntry.count({
    where: { contestId, steps: { gt: me.steps } },
  });
  return { rank: better + 1, steps: me.steps };
}

export async function startClaim(contestId: number, uid: number) {
  const now = nowInTz().toJSDate();
  const contest = await prisma.contest.findUnique({ where: { id: contestId } });
  if (!contest) return { status: 404 as const, message: '赛事不存在' };
  if (contest.endAt > now) return { status: 400 as const, message: '赛事未结束，暂不可领取' };

  const { rank, steps } = await computeRank(contestId, uid);
  if (!rank) return { status: 403 as const, message: '未参赛或成绩无效' };
  const rewardTopN = await prisma.contestPrizeRule.findFirst({ where: { contestId }, orderBy: { rankEnd: 'desc' }, take: 1 });
  const topCount = rewardTopN?.rankEnd ?? 10;
  if (rank > topCount) return { status: 403 as const, message: '未在获奖名次内，无法领取' };

  const claim = await prisma.contestPrizeClaim.upsert({
    where: { contestId_userId: { contestId, userId: uid } },
    update: { rank, steps },
    create: { contestId, userId: uid, rank, steps, status: 'PENDING' },
  });

  return {
    claimId: claim.id,
    rank: claim.rank,
    status: claim.status,
    stateHint: claim.status === 'COMPLETED' ? '已完成' : null,
  };
}

export async function getClaimByContest(contestId: number, uid: number) {
  const claim = await prisma.contestPrizeClaim.findUnique({
    where: { contestId_userId: { contestId, userId: uid } },
    select: { id: true },
  });
  return claim ? { claimId: claim.id } : { claimId: null };
}

export async function getClaimDetail(uid: number, opts: { claimId?: number; contestId?: number }) {
  let claim: Awaited<ReturnType<typeof prisma.contestPrizeClaim.findUnique>> & { contest?: { title: string } } | null = null;
  if (opts.claimId) {
    claim = await prisma.contestPrizeClaim.findUnique({
      where: { id: opts.claimId },
      include: { contest: { select: { title: true } } },
    });
  } else if (opts.contestId) {
    claim = await prisma.contestPrizeClaim.findFirst({
      where: { contestId: opts.contestId, userId: uid },
      include: { contest: { select: { title: true } } },
    });
  }
  if (!claim || claim.userId !== uid) return null;

  const csAgents = await prisma.serviceAgent.findMany({ where: { isActive: true } });
  const csWeChatIds = csAgents.map((agent) => agent.wechatId);
  const csWeChatId = csWeChatIds[Math.floor(Math.random() * csWeChatIds.length)];
  
  const stateHint = (() => {
    switch (claim.status) {
      case PrizeClaimStatus.PENDING: return '已提交';
      case PrizeClaimStatus.COMPLETED: return '已完成';
      case PrizeClaimStatus.REJECTED: return '已驳回';
      default: return '';
    }
  })();

  return {
    claimId: claim.id,
    contestId: claim.contestId,
    title: claim.contest?.title,
    rank: claim.rank,
    status: claim.status,
    imageUrl: '',
    csWeChatId,
    stateHint,
  };
}
