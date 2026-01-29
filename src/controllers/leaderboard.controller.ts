import { Request, Response } from 'express';
import { z } from 'zod';
import * as LeaderboardService from '../services/leaderboard.service';
import type { Scope } from '../utils/time';

export async function getList(req: Request, res: Response) {
  const q = z.object({
    contestId: z.coerce.number().int().positive(),
    scope: z.enum(['day', 'week', 'month']).default('day'),
    page: z.coerce.number().int().min(1).default(1),
    size: z.coerce.number().int().min(1).max(100).default(30),
  }).parse(req.query);

  const data = await LeaderboardService.getLeaderboardPage(
    q.scope as Scope,
    q.contestId,
    q.page,
    q.size
  );
  res.json(data);
}

export async function getMyRank(req: Request, res: Response) {
  const q = z.object({
    scope: z.enum(['day', 'week', 'month']).default('day'),
    contestId: z.coerce.number().int().positive(),
    userId: z.coerce.number().int().positive().optional(),
  }).parse(req.query);

  let uid: number | undefined = q.userId;
  if ((req as any).user?.id && Number.isFinite((req as any).user.id)) {
    uid = Number((req as any).user.id);
  }
  if (!uid) return res.status(401).json({ error: 'unauthorized' });

  const me = await LeaderboardService.getMyRank(q.scope as Scope, q.contestId, uid);
  if (!me) return res.status(204).end();
  res.json(me);
}

export async function getSnapshot(req: Request, res: Response) {
  const q = z.object({
    contestId: z.coerce.number().int().positive(),
    userId: z.coerce.number().int().positive().optional(),
  }).parse(req.query);

  let uid: number | undefined = (req as any).user?.id != null && Number.isFinite((req as any).user.id)
    ? Number((req as any).user.id)
    : undefined;

  const snap = await LeaderboardService.getSnapshot(q.contestId, uid);
  res.json(snap);
}
