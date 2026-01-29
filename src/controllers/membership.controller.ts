import { Request, Response } from 'express';
import { z } from 'zod';
import { MembershipTier } from '@prisma/client';
import * as MembershipService from '../services/membership.service';

/** Map legacy body tier to schema enum */
function toTier(tier: string): MembershipTier {
  if (tier === 'VIP' || tier === 'SILVER') return 'SILVER';
  if (tier === 'VIP_PLUS' || tier === 'GOLD') return 'GOLD';
  return 'SILVER';
}

export async function purchase(req: Request, res: Response) {
  const uid = Number((req as any).user?.id);
  const body = z.object({
    tier: z.enum(['VIP', 'VIP_PLUS', 'SILVER', 'GOLD']),
    months: z.number().int().min(1).max(12).optional().default(1),
  }).parse(req.body);

  const result = await MembershipService.purchase(uid, toTier(body.tier), body.months);
  res.json(result);
}

export async function getMe(req: Request, res: Response) {
  const uid = Number((req as any).user?.id);
  const data = await MembershipService.getMe(uid);
  res.json(data);
}

export async function getProducts(_req: Request, res: Response) {
  res.json(MembershipService.getProducts());
}
