import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as ContestService from '../services/contest.service';
import * as AdminContestService from '../services/admin.contest.service';


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

export async function adminList(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Number(req.query.page ?? 1);
    const size = Number(req.query.size ?? 50);
    const where = (req.query.filters as object) ?? {};
    const contests = await AdminContestService.listContests(page, size, where);
    res.json(contests);
  } catch (err) {
    next(err);
  }
}

export async function adminGetById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
    const contest = await AdminContestService.getContestById(id);
    if (!contest) return res.status(404).json({ error: 'Contest not found' });
    res.json(contest);
  } catch (err) {
    next(err);
  }
}

export async function adminCreate(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body ?? {};
    const data = {
      title: String(body.title),
      scope: body.scope,
      regionCode: String(body.regionCode) ?? "",
      heatLevel: Number(body.heatLevel),
      frequency: body.frequency,
      audience: body.audience,
      status: body.status,
      startAt: new Date(body.startAt),
      endAt: new Date(body.endAt),
    };
    const contest = await AdminContestService.createContest(data);
    res.status(201).json(contest);
  } catch (err) {
    next(err);
  }
}

export async function adminUpdate(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
    const body = req.body ?? {};
    const data: any = {};
    if (body.title !== undefined) data.title = String(body.title);
    if (body.scope !== undefined) data.scope = body.scope;
    if (body.regionCode !== undefined) data.regionCode = String(body.regionCode) ?? '';
    if (body.heatLevel !== undefined) data.heatLevel = Number(body.heatLevel);
    if (body.frequency !== undefined) data.frequency = body.frequency;
    if (body.audience !== undefined) data.audience = body.audience;
    if (body.status !== undefined) data.status = body.status;
    if (body.startAt !== undefined) data.startAt = new Date(body.startAt);
    if (body.endAt !== undefined) data.endAt = new Date(body.endAt);
    const contest = await AdminContestService.updateContest(id, data);
    res.json(contest);
  } catch (err) {
    next(err);
  }
}

export async function adminDelete(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
    await AdminContestService.deleteContest(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
