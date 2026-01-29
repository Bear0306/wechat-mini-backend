import { Request, Response } from 'express';
import { z } from 'zod';
import * as ContestService from '../services/contest.service';


export async function getRecent (req: Request, res: Response) {
  try {
    const uid = Number(req.user?.id ?? 5);
    const items3 = await ContestService.getUserRecentContests(uid);
    res.json({ items: items3 });
  } catch (error) {
    res.json({ items: [] });
  }
}


export async function getAll (req: Request, res: Response) {
  const uid = Number(req.user?.id?? 5);
  const allItems = await ContestService.getUserContestList(uid, 0);
  res.json({ items: allItems });
}


export async function getEnded (req: Request, res: Response) {
  const q = z.object({
    page: z.coerce.number().int().min(1).default(1),
    size: z.coerce.number().int().min(1).max(50).default(10)
  }).parse(req.query);

  const uid  = req.user!.id;

  const result = await ContestService.getEndedContestList(uid, q.page, q.size);

  res.json(result);
}


export async function participate (req: Request, res: Response) {
  const uid = Number(req.user?.id); // 本地联调用固定用户

  const body = z.object({
    contestId: z.coerce.number().int().positive(),
  }).safeParse(req.body);

  if (!body.success) return res.status(400).json({ message: '参数错误' });

  try {
    const result = await ContestService.participateContest(uid, body.data.contestId);
    res.json({ ok: true, ...result });
  } catch (err: any) {
    res.status(err.status || 500).json({ message: err.message || '服务器错误' });
  }

}
