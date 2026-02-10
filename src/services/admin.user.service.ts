import { prisma } from '../db';
import { AgeGroup } from '@prisma/client'

export interface AdminUserUpdate {
  realNameVerified?: boolean;
  canParticipate?: boolean;
  canBuyMembership?: boolean;
  ageGroup?: AgeGroup;
}

export async function findUserById(id: number) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      openid: true,
      wechatNick: true,
      avatarUrl: true,
      realNameVerified: true,
      birthDate: true,
      city: true,
      canParticipate: true,
      canBuyMembership: true, 
      totalRewardsCent: true,
      joinCount: true,
      prizeMultiplier: true,
      referralCode: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return user;
}

export async function updateUser( id: number, data: AdminUserUpdate) {
  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(data.realNameVerified !== undefined && { realNameVerified: data.realNameVerified }),
      ...(data.canParticipate !== undefined && { canParticipate: data.canParticipate }),
      ...(data.canBuyMembership !== undefined && { canBuyMembership: data.canBuyMembership }),
      ...(data.ageGroup !== undefined && { ageGroup: { set: data.ageGroup } }),
    },
    select: {
      id: true,
      wechatNick: true,
      realNameVerified: true,
      ageGroup: true,
      canParticipate: true,
      canBuyMembership: true,
      updatedAt: true,
    },
  });
  return updated;
}
