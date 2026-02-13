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
  // First try to find if there's a row for this userId
  const existing = await prisma.userSteps.findUnique({
    where: { userId },
  });

  if (existing) {
    // If a row exists, update it
    await prisma.userSteps.update({
      where: { userId },
      data: { stepInfoList: JSON.stringify(stepInfoList) },
    });
  } else {
    // If no row exists, create a new one
    await prisma.userSteps.create({
      data: { userId, stepInfoList: JSON.stringify(stepInfoList) },
    });
  }
}