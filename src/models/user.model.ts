import { prisma } from '../db';
import { AgeGroup } from '@prisma/client';


export async function getUserJoinCount(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { joinCount: true },
  });
  return user?.joinCount ?? 0;
}

export async function updateUserJoinCount(userId: number, new_count: number) {
  await prisma.user.update({
    where: { id: userId },
    data: { joinCount: new_count }
  });
}

export async function getUserById(id: number) {
  return prisma.user.findUnique({ where: { id } });
}

export async function getUserByOpenId(openid: string) {
  return prisma.user.findUnique({ where: { openid } });
}


export async function updateUserProfile(uid: number, nickname: string, avatar: string) {
  return prisma.user.update({
    where: { id: uid },
    data: { wechatNick: nickname, avatarUrl: avatar }
  });
}

export async function upsertUserByOpenid(openid: string) {
  return prisma.user.upsert({
    where: { openid },
    create: {
      openid,
      ageGroup: AgeGroup.ADULT,
      canParticipate: true,
      canBuyMembership: true,
      city: '未知',
      joinCount: 3,
      prizeMultiplier: 1
    },
    update: {},
  });
}


export function findUserBasic(uid: number) {
  return prisma.user.findUnique({
    where: { id: uid },
    select: {
      id: true,
      wechatNick: true,
      avatarUrl: true,
      joinCount: true,
      prizeMultiplier: true,
    },
  });
}

export function findUserCount(uid: number) {
  return prisma.user.findUnique({
    where: { id: uid },
    select: {
      joinCount: true,
      prizeMultiplier: true,
    },
  });
}