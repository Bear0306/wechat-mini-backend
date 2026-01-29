import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as AdminPrizeRuleService from '../services/admin.prizeRule.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const contestId = z.coerce.number().int().positive().parse(req.query.contestId);
    const list = await AdminPrizeRuleService.listByContest(contestId);
    res.json(list);
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
    const rule = await AdminPrizeRuleService.getById(id);
    if (!rule) return res.status(404).json({ error: 'Prize rule not found' });
    res.json(rule);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const body = z.object({
      contestId: z.number().int().positive(),
      rankStart: z.number().int().min(1),
      rankEnd: z.number().int().min(1),
      prizeValueCent: z.number().int().min(0),
      audience: z.enum(['ADULTS', 'YOUTH']).optional().nullable(),
    }).parse(req.body);
    const rule = await AdminPrizeRuleService.create(body);
    res.status(201).json(rule);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
    const body = z.object({
      rankStart: z.number().int().min(1).optional(),
      rankEnd: z.number().int().min(1).optional(),
      prizeValueCent: z.number().int().min(0).optional(),
      audience: z.enum(['ADULTS', 'YOUTH']).optional().nullable(),
    }).parse(req.body);
    const rule = await AdminPrizeRuleService.update(id, body);
    res.json(rule);
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
    await AdminPrizeRuleService.remove(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
