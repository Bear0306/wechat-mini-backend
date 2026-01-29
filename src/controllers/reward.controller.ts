import { Request, Response } from 'express';
import { z } from 'zod';
import * as RewardService from '../services/reward.service';

export async function startClaim(req: Request, res: Response) {
  const body = z.object({ contestId: z.number().int().positive() }).safeParse(req.body);
  if (!body.success) return res.status(400).json({ message: '参数错误' });
  const uid = Number((req as any).user?.id);
  const result = await RewardService.startClaim(body.data.contestId, uid);
  if ('status' in result && result.status === 404) return res.status(404).json({ message: result.message });
  if ('status' in result && result.status === 400) return res.status(400).json({ message: result.message });
  if ('status' in result && result.status === 403) return res.status(403).json({ message: result.message });
  res.json(result);
}

export async function getByContest(req: Request, res: Response) {
  const q = z.object({ contestId: z.coerce.number().int().positive() }).safeParse(req.query);
  if (!q.success) return res.status(400).json({ message: '参数错误' });
  const uid = Number((req as any).user?.id);
  const data = await RewardService.getClaimByContest(q.data.contestId, uid);
  res.json(data);
}

export async function getDetail(req: Request, res: Response) {
  const q = z.object({
    claimId: z.coerce.number().int().positive().optional(),
    contestId: z.coerce.number().int().positive().optional(),
  }).safeParse(req.query);
  if (!q.success) return res.status(400).json({ message: '参数错误' });
  if (!q.data.claimId && !q.data.contestId) return res.status(400).json({ message: '缺少 claimId 或 contestId' });
  const uid = Number((req as any).user?.id);
  const data = await RewardService.getClaimDetail(uid, { claimId: q.data.claimId, contestId: q.data.contestId });
  if (!data) return res.status(404).json({ message: '未找到' });
  res.json(data);
}
