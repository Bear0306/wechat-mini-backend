import { prisma } from '../db';
import type { ContestStatus, RegionLevel, ContestFreq, ContestAudience } from '@prisma/client';

export async function listContests(page: number, size: number, where: object = {}) {
  const take = Math.min(Math.max(size, 1), 200);
  const skip = Math.max((page - 1) * take, 0);
  const contests = await prisma.contest.findMany({
    where,
    skip,
    take,
    orderBy: { createdAt: 'desc' },
  });
  return contests;
}

export async function getContestById(id: number) {
  return prisma.contest.findUnique({
    where: { id },
    include: { contestPrizeRule: true },
  });
}

export type ContestCreateInput = {
  title: string;
  scope: RegionLevel;
  regionCode: string | "";
  heatLevel: number;
  frequency: ContestFreq;
  audience?: ContestAudience;
  status?: ContestStatus;
  startAt: Date;
  endAt: Date;
};

export async function createContest(data: ContestCreateInput) {
  return prisma.contest.create({
    data: {
      title: data.title,
      scope: data.scope,
      regionCode: data.regionCode ?? '',
      frequency: data.frequency,
      audience: data.audience ?? 'ADULTS',
      status: data.status ?? 'SCHEDULED',
      startAt: data.startAt,
      endAt: data.endAt,
    },
  });
}

export type ContestUpdateInput = Partial<ContestCreateInput>;

export async function updateContest(id: number, data: ContestUpdateInput) {
  return prisma.contest.update({
    where: { id },
    data: data as any,
  });
}

export async function deleteContest(id: number) {
  return prisma.contest.delete({ where: { id } });
}
