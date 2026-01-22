import { DateTime } from 'luxon';
import { prisma } from '../db';
import { AgeGroup } from '@prisma/client';

export async function getUserById(id: number) {
  return prisma.user.findUnique({ where: { id } });
}

export async function getUserByOpenId(openid: string) {
  return prisma.user.findUnique({ where: { openid } });
}

export async function upsertUserByOpenid(openid: string, unionid?: string) {
  return prisma.user.upsert({
    where: { openid },
    update: { unionid },
    create: {
      openid,
      unionid,
      wechatNick: '新用户',
      ageGroup: AgeGroup.ADULT,
      canParticipate: true,
      canBuyMembership: true,
      city: '未知',
      leftChallenge: 3
    },
  });
}

export async function updateUserProfile(
  id: number,
  data: {
    phone?: string;               // plain phone from client
    wechatNick?: string;
    avatarUrl?: string;
    city?: string;
    realNameVerified?: boolean;
    birthDate?: Date;
  }
) {
  const { phone, ...rest } = data;
  return prisma.user.update({
    where: { id },
    data: {
      ...rest,
      // TODO: replace with AES later
      phoneEnc: phone ?? undefined,
    },
  });
}

type StepInfo = {
  timestamp: number
  step: number
}

export async function upsertUserSteps(
  userId: number,
  newStepInfoList: StepInfo[]
) {

  const SECONDS_PER_DAY = 86400
  const DAYS = 35

  // Use timezone from env or default to Asia/Shanghai
  const tz = process.env.TZ || 'Asia/Shanghai'

  // Today at 00:00 in the desired timezone
  const today = DateTime.local().setZone(tz).startOf('day')
  const cutoffTimestamp = today.toSeconds() - DAYS * SECONDS_PER_DAY

  // Read existing steps from DB
  const existing = await prisma.userSteps.findUnique({
    where: { userId },
  })

  let combinedSteps: StepInfo[] = []

  if (existing?.stepInfoList) {
    try {
      const existingSteps: StepInfo[] = JSON.parse(existing.stepInfoList)
      combinedSteps = [...existingSteps, ...newStepInfoList]
    } catch {
      combinedSteps = [...newStepInfoList]
    }
  } else {
    combinedSteps = [...newStepInfoList]
  }

  // Deduplicate by timestamp (keep latest from newStepInfoList)
  const stepMap = new Map<number, StepInfo>()
  combinedSteps.forEach(step => stepMap.set(step.timestamp, step))
  combinedSteps = Array.from(stepMap.values())

  // Keep only last 35 days and sort
  const filteredSteps = combinedSteps
    .filter(item => item.timestamp >= cutoffTimestamp)
    .sort((a, b) => a.timestamp - b.timestamp)

  const contests = await prisma.contest.findMany({
    where: { status: 'ACTIVE' },
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
  })

  // Flatten Contest -> entries into your desired structure
  const flattened = contests.flatMap(contest =>
    contest.entries.map(entry => ({
      contestId: contest.id,
      startAt: contest.startAt,
      endAt: contest.endAt,
      entryId: entry.id,
      userId: entry.userId
      }))
  )

  const filteredRows = flattened.filter(row => row.userId === userId)

  // Add steps to each contest
  const result = filteredRows.map(contest => {
    const startTs = Math.floor(contest.startAt.getTime() / 1000);
    const endTs = Math.floor(contest.endAt.getTime() / 1000);

    const totalSteps = filteredSteps
      .filter(step => step.timestamp >= startTs && step.timestamp < endTs)
      .reduce((sum, step) => sum + step.step, 0);

    return { ...contest, steps: totalSteps };
  });

  for (const contest of result) {
    await prisma.contestEntry.update({
      where: { id: contest.entryId },
      data: { steps: contest.steps },
    });
  }
  

  // Upsert into DB
  return prisma.userSteps.upsert({
    where: { userId },
    update: { stepInfoList: JSON.stringify(filteredSteps) },
    create: { userId, stepInfoList: JSON.stringify(filteredSteps) },
  })
}