import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as AdminPrizeService from '../services/admin.prize.service';

export async function listClaims(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body ?? {};
    const page = Number(body.page ?? 1);
    const size = Number(body.size ?? 50);
    const where = body.filters ?? {};
    const claims = await AdminPrizeService.listClaims(page, size, where);
    res.json(claims);
  } catch (err) {
    next(err);
  }
}

export async function verify(req: Request, res: Response) {
  const body = z.object({
    claimId: z.number().int().positive(),
    pass: z.boolean(),
    note: z.string().max(200).optional(),
  }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ message: '参数错误' });
  const result = await AdminPrizeService.verifyClaim(body.data.claimId, body.data.pass, body.data.note);
  res.json(result);
}

export async function ship(req: Request, res: Response) {
  const body = z.object({ claimId: z.number().int().positive() }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ message: '参数错误' });
  const result = await AdminPrizeService.shipClaim(body.data.claimId);
  res.json(result);
}

export async function updateClaimStatus(req: Request, res: Response, next: NextFunction) {
  const claimId = Number(req.params.id);
  if (!Number.isFinite(claimId)) return res.status(400).json({ error: 'Invalid claim id' });
  const body = z.object({
    status: z.enum(['PENDING_INFO', 'SUBMITTED', 'VERIFIED', 'SHIPPED', 'COMPLETED', 'REJECTED']),
  }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ message: '参数错误', issues: body.error.flatten() });
  try {
    const updated = await AdminPrizeService.updateClaimStatus(claimId, body.data.status);
    res.json(updated);
  } catch (e: any) {
    if (e?.code === 'P2025') return res.status(404).json({ error: 'Claim not found' });
    if (e?.message === 'Invalid status') return res.status(400).json({ error: 'Invalid status' });
    next(e);
  }
}
