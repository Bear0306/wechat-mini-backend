import { Request, Response, NextFunction } from 'express';
import * as AdminLeaderboardService from '../services/admin.leaderboard.service';

export async function getContestRanking(req: Request, res: Response, next: NextFunction) {
  const contestId = Number(req.params.contestId);
  if (!Number.isFinite(contestId)) return res.status(400).json({ error: 'Invalid contest id' });
  const topN = Math.min(Math.max(Number(req.query.topN) || 10, 1), 100);
  const tailCount = Math.min(Math.max(Number(req.query.tailCount) || 5, 0), 20);
  try {
    const result = await AdminLeaderboardService.getContestRanking(contestId, topN, tailCount);
    if (!result) return res.status(404).json({ error: 'Contest not found' });
    res.json(result);
  } catch (e) {
    next(e);
  }
}
