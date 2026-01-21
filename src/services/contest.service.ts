import { prisma } from '../db';
import { ContestFreq } from '@prisma/client';
import { DateTime } from 'luxon';

// export async function getOrCreateContest(city: string, heatLevel: number) {
//     const freq: ContestFreq = heatLevel >= 4 ? 'DAILY': 'WEEKLY';
//     const now = DateTime.now();
//     const startAt = freq === 'DAILY' ? now.startOf('day') : now.startOf('week');
//     const endAt = freq === 'DAILY' ? now.endOf('day') : now.endOf('week');
//     const existing = await prisma.contest.findFirst({
//         where: {
//             scope: 'CITY',
//             regionCode: city,
//             startAt: { lte: now.toJSDate() },
//             endAt: { gte: now.toJSDate()}
//         }
//     });
    
//     if (existing) 
//         return existing;
    
//     return prisma.contest.create({
//         data: {
//             scope: 'CITY',
//             regionCode: city,
//             heatLevel,
//             frequency: freq,
//             prizeMin: heatLevel >= 4 ? 100 : 50,
//             prizeMax: heatLevel >= 4 ? 500 : 200,
//             startAt: startAt.toJSDate(),
//             endAt: endAt.toJSDate()
//         }
//     });
// } 

export async function getUserContestList( userId: number, limit: number | null = 3) {
  const now = new Date();

  // 1️⃣ User's joined contests
  const joined = await prisma.contestEntry.findMany({
    where: { userId },
    select: { contestId: true },
    distinct: ['contestId'],
  });
  const joinedIds = joined.map((r: { contestId: number }) => r.contestId);

  // 2️⃣ Upcoming contests (not started yet)
  const upcoming = await prisma.contest.findMany({
    where: { startAt: { gt: now } },
    select: { id: true },
    orderBy: { startAt: 'asc' },
  });
  const upcomingIds = upcoming.map((r: { id: number }) => r.id);

  // 3️⃣ Merge and dedupe IDs
  const allContestIds = Array.from(new Set([...joinedIds, ...upcomingIds]));
  if (allContestIds.length === 0) return [];

  // 4️⃣ Fetch contest rows (limit optional)
  const contests = await prisma.contest.findMany({
    where: { id: { in: allContestIds } },
    orderBy: { startAt: 'desc' },
    ...(limit && limit > 0 ? { take: limit } : {}), // skip `take` if unlimited
  });

  // 5️⃣ Add joined flag
  return contests.map((c: typeof contests[number]) => ({
    ...c,
    joined: joinedIds.includes(c.id),
  }));
}