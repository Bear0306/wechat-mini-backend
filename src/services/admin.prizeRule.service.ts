import { prisma } from '../db';
import type { ContestAudience } from '@prisma/client';

export async function listByContest(contestId: number) {
  return prisma.contestPrizeRule.findMany({
    where: { contestId },
    orderBy: [{ rankStart: 'asc' }],
  });
}

export async function getById(id: number) {
  return prisma.contestPrizeRule.findUnique({ where: { id } });
}

export type PrizeRuleCreateInput = {
  contestId: number;
  rankStart: number;
  rankEnd: number;
  prizeValueCent: number;
};

export async function create(data: PrizeRuleCreateInput) {
  return prisma.contestPrizeRule.create({
    data: {
      contestId: data.contestId,
      rankStart: data.rankStart,
      rankEnd: data.rankEnd,
      prizeValueCent: data.prizeValueCent,
    },
  });
}

export type PrizeRuleUpdateInput = Partial<Omit<PrizeRuleCreateInput, 'contestId'>>;

export async function update(id: number, data: PrizeRuleUpdateInput) {
  return prisma.contestPrizeRule.update({
    where: { id },
    data,
  });
}

export async function remove(id: number) {
  return prisma.contestPrizeRule.delete({ where: { id } });
}
