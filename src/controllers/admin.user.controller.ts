import { Request, Response, NextFunction } from 'express';
import * as AdminUserService from '../services/admin.user.service';

export async function getUserById(req: Request, res: Response, next: NextFunction) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid user id' });
  try {
    const user = await AdminUserService.findUserById(id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (e) {
    next(e);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid user id' });
  const body = req.body ?? {};
  const data = {
    realNameVerified: body.realNameVerified,
    canParticipate: body.canParticipate,
    canBuyMembership: body.canBuyMembership,
    ageGroup: body.ageGroup
  };
  if (Object.keys(data).every((k) => data[k as keyof typeof data] === undefined)) {
    return res.status(400).json({ error: 'No fields to update' });
  }
  try {
    const updated = await AdminUserService.updateUser(id, data);
    res.json(updated);
  } catch (e: any) {
    if (e?.code === 'P2025') return res.status(404).json({ error: 'User not found' });
    next(e);
  }
}
