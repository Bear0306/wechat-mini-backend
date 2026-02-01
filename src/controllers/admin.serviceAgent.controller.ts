import { Request, Response, NextFunction } from 'express';
import * as AdminServiceAgentService from '../services/admin.serviceAgent.service';

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const agents = await AdminServiceAgentService.listServiceAgents();
    res.json(agents);
  } catch (e) {
    next(e);
  }
}

export async function listActive(req: Request, res: Response, next: NextFunction) {
  try {
    const agents = await AdminServiceAgentService.listActiveServiceAgents();
    res.json(agents);
  } catch (e) {
    next(e);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
  try {
    const agent = await AdminServiceAgentService.getServiceAgentById(id);
    if (!agent) return res.status(404).json({ error: 'Service agent not found' });
    res.json(agent);
  } catch (e) {
    next(e);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  const { name, wechatId } = req.body ?? {};
  if (!name || typeof name !== 'string') return res.status(400).json({ error: 'name is required' });
  try {
    const agent = await AdminServiceAgentService.createServiceAgent({ name, wechatId: wechatId ?? null });
    res.status(201).json(agent);
  } catch (e: any) {
    if (e?.code === 'P2002') return res.status(409).json({ error: 'WechatId already exists' });
    next(e);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
  const body = req.body ?? {};
  const data = {
    name: body.name,
    wechatId: body.wechatId,
    isActive: body.isActive,
  };
  try {
    const agent = await AdminServiceAgentService.updateServiceAgent(id, data);
    res.json(agent);
  } catch (e: any) {
    if (e?.code === 'P2025') return res.status(404).json({ error: 'Service agent not found' });
    next(e);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid id' });
  try {
    await AdminServiceAgentService.deleteServiceAgent(id);
    res.status(204).send();
  } catch (e: any) {
    if (e?.code === 'P2025') return res.status(404).json({ error: 'Service agent not found' });
    next(e);
  }
}
