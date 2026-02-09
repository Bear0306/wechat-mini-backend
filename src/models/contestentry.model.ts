import { prisma } from '../db';


export async function getJoinedContestIds(userId: number) {
  const joined = await prisma.contestEntry.findMany({
    where: { userId },
    select: { contestId: true },
    distinct: ['contestId'],
  });
  const joinedIds = joined.map((r: { contestId: number }) => r.contestId);
  return joinedIds;
}

export async function upsertContestEntry(userId: number, contestId: number) {
  const now = new Date();
  const entry = await prisma.contestEntry.upsert({
    where: { userId_contestId: { userId: userId, contestId: contestId } },
    update: {}, // 已报名则不改动（也可重置 steps=0 看你需求）
    create: {
      userId: userId,
      contestId: contestId,
      steps: 0,
      submittedAt: now,
    },
    select: { id: true, contestId: true },
  });
  return entry;
}

export async function upsertUserSteps( entryId: number, steps: number ) {
  await prisma.contestEntry.update({
    where: { id: entryId },
    data: { steps: steps },
  });
}