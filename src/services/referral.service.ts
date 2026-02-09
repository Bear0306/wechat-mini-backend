import crypto from 'crypto';
import { prisma } from '../db';

export async function getOrCreateReferralCode(userId: number) {
  // Find the user and check if they already have a referral code
  let user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, referralCode: true }
  });

  // If the user doesn't have a referral code, create one
  if (!user || !user.referralCode) {
    let code: string;
    do {
      code = 'R' + crypto.randomBytes(4).toString('hex').toUpperCase();
      const exists = await prisma.user.findUnique({
        where: { referralCode: code },
        select: { id: true }
      });
      if (!exists) break;
    } while (true);

    user = await prisma.user.update({
      where: { id: userId },
      data: { referralCode: code },
      select: { id: true, referralCode: true }
    });
  }

  // Prepare basic response (add .usedCount and .createdAt if needed)
  return { ok: true, code: user.referralCode };

}

export async function acceptReferral(code: string, refereeId: number) {
  // Look up the user who owns the referral code
  const referrer = await prisma.user.findUnique({
    where: { referralCode: code },
    select: { id: true, referralCode: true }
  });
  if (!referrer) {
    return { ok: false, error: 'Invalid referral code', status: 404 as const };
  }
  if (referrer.id === refereeId) {
    return { ok: false, error: 'You cannot refer yourself', status: 400 as const };
  }
  // Check if this referee already has a referral
  const existing = await prisma.referral.findUnique({ where: { refereeId } });
  if (existing) {
    return { ok: true, alreadyAccepted: true };
  }
  await prisma.referral.create({
    data: { referrerId: referrer.id, refereeId }
  });
  // Optionally, you could update a usedCount on user if needed,
  // but the user table does not appear to have that field.
  return { ok: true };
}

export async function addReferral(referrerIdInput: number | string, refereeIdInput: number | string) {
    const referrerId = Number(referrerIdInput);
    const refereeId = Number(refereeIdInput);

    if (!Number.isFinite(referrerId) || !Number.isFinite(refereeId)) {
        throw new Error('Invalid referrerId/refereeId');
    }

    if (referrerId === refereeId) return;
    
    try {
        await prisma.referral.create({
            data: { referrerId, refereeId },
        });
    } catch (e: any) {
        if (e?.code === 'P2002') return;

        throw e;
    }
}

export async function getReferralMultiplier(userIdInput: number | string): Promise<{ multiplierX: number; referredCount: number }> {
    const userId = Number(userIdInput);
    
    if (!Number.isFinite(userId)) {
        throw new Error('Invalid userId');
    }

    const referredCount = await prisma.referral.count({
        where: { referrerId: userId },
    });

    let multiplierX = 1;
    if (referredCount >= 6) multiplierX = 3;
    else if (referredCount >= 3) multiplierX = 2;

    return { multiplierX, referredCount };
}
