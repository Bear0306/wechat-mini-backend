import { prisma } from '../db';

export async function getUserStepsList(userId: number) {
  const steps = await prisma.userSteps.findUnique({
    where: { userId: userId },
    select: { stepInfoList: true },
  });
  const stepsData = steps?.stepInfoList || '[]';
  const jsondata = JSON.parse(stepsData) as { timestamp: number; step: number }[]
  return jsondata;
}

export async function upsertUserStepsList(userId: number, stepInfoList: Array<{ timestamp: number; step: number }>) {
  prisma.userSteps.upsert({
    where: { userId },
    update: { stepInfoList: JSON.stringify(stepInfoList) },
    create: { userId, stepInfoList: JSON.stringify(stepInfoList) },
  })
}