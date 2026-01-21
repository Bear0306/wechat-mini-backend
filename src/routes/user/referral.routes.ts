import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db';
import crypto from 'crypto';

import { addReferral, getReferralMultiplier, grantReferralIfEligible } from '../../services/referral.service';

const router=Router();

router.get('/code', async(req: any, res) => {
  try {
    const userId = Number(req.user?.id); 

    // Step 1: check if user already has a code
    let referral = await prisma.referralCode.findUnique({
      where: { userId },
    });

    // Step 2: create new unique code if missing
    if (!referral) {
      let code: string;

      while (true) {
        // generate random code e.g. R8C1A2F5
        code = 'R' + crypto.randomBytes(4).toString('hex').toUpperCase();

        // check if already taken
        const exists = await prisma.referralCode.findUnique({ where: { code } });
        if (!exists) break;
      }

      referral = await prisma.referralCode.create({
        data: { userId, code },
      });
    }

    res.json({
      ok: true,
      code: referral.code,
      usedCount: referral.usedCount,
      createdAt: referral.createdAt,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Failed to get referral code' });
  }
});

router.post('/accept', async(req: any, res) => {
  try {
    const refereeId = Number(req.user?.id);
    const code = String(req.body.code || '').trim();

    if (!code) {
      return res.status(400).json({ ok: false, error: 'Missing referral code' });
    }

    // 1️⃣ Find the referrer by code
    const referrer = await prisma.referralCode.findUnique({
      where: { code },
    });

    if (!referrer) {
      return res.status(404).json({ ok: false, error: 'Invalid referral code' });
    }

    if (referrer.userId === refereeId) {
      return res.status(400).json({ ok: false, error: 'You cannot refer yourself' });
    }

    // 2️⃣ Check if this user already accepted a referral
    const existing = await prisma.referral.findUnique({ where: { refereeId } });

    if (existing) {
      return res.json({ ok: true, alreadyAccepted: true });
    }

    // 3️⃣ Create the referral record + increment usedCount (atomic transaction)
    await prisma.$transaction([
      prisma.referral.create({
        data: {
          referrerId: referrer.userId,
          refereeId: refereeId
        },
      }),
      prisma.referralCode.update({
        where: { code },
        data: { usedCount: { increment: 1 } },
      }),
    ]);

    return res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Failed to accept referral' });
  }
});


router.post('/bind', async(req: any, res) => {
    // const body = z.object({referrerId: z.string()}).parse(req.body);
    
    // await addReferral(body.referrerId, req.user!.id);
    
    // const multi = await getReferralMultiplier(body.referrerId);
    // res.json({ok: true, referrerMultiplier: multi});
    const uid = Number(req.user?.id);             // 新用户
    const { referrerId } = req.body;

    if (!referrerId || referrerId === uid) return res.status(400).json({ message: '参数错误' });

    // 避免重复绑定
    const exists = await prisma.referral.findFirst({ where: { refereeId: uid }});
    if (!exists) {
        await prisma.referral.create({ data: { referrerId, refereeId: uid }});
        await grantReferralIfEligible(referrerId);
    }
    res.json({ ok: true });
});

router.get('/multiplier', async(req: any, res) => {
    const multi = await getReferralMultiplier(req.user!.id);
    res.json({multiplierX: multi});
});

export default router;