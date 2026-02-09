import { Request, Response } from 'express';
import { z } from 'zod';
import * as ReferralService from '../services/referral.service';

export async function getCode(req: Request, res: Response) {
  try {
    const userId = Number((req as any).user?.id);
    const data = await ReferralService.getOrCreateReferralCode(userId);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Failed to get referral code' });
  }
}

export async function accept(req: Request, res: Response) {
  try {
    const refereeId = Number((req as any).user?.id);
    const code = String((req.body?.code ?? '')).trim();
    if (!code) return res.status(400).json({ ok: false, error: 'Missing referral code' });

    const result = await ReferralService.acceptReferral(code, refereeId);
    if ('status' in result && result.status === 404) return res.status(404).json({ ok: false, error: result.error });
    if ('status' in result && result.status === 400) return res.status(400).json({ ok: false, error: result.error });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, error: 'Failed to accept referral' });
  }
}

export async function bind(req: Request, res: Response) {
  const uid = Number((req as any).user?.id);
  const body = z.object({ referrerId: z.coerce.number().int().positive() }).safeParse(req.body);
  if (!body.success || body.data.referrerId === uid) {
    return res.status(400).json({ message: '参数错误' });
  }
  await ReferralService.addReferral(body.data.referrerId, uid);
  res.json({ ok: true });
}

export async function getMultiplier(req: Request, res: Response) {
  const multi = await ReferralService.getReferralMultiplier((req as any).user!.id);
  res.json({ multiplierX: multi.multiplierX });
}
