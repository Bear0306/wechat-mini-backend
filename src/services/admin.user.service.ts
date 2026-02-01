import { prisma } from '../db';

export interface AdminUserUpdate {
  isPromoter?: boolean;
  canParticipate?: boolean;
  totalRewardsCent?: number;
}

export async function findUserById(id: number) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      openid: true,
      wechatNick: true,
      avatarUrl: true,
      canParticipate: true,
      isPromoter: true,
      totalRewardsCent: true,
      joinCount: true,
      prizeMultiplier: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return user;
}

export async function updateUser(id: number, data: AdminUserUpdate) {
  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(data.isPromoter !== undefined && { isPromoter: data.isPromoter }),
      ...(data.canParticipate !== undefined && { canParticipate: data.canParticipate }),
      ...(data.totalRewardsCent !== undefined && { totalRewardsCent: data.totalRewardsCent }),
    },
    select: {
      id: true,
      wechatNick: true,
      canParticipate: true,
      isPromoter: true,
      totalRewardsCent: true,
      updatedAt: true,
    },
  });
  return updated;
}
