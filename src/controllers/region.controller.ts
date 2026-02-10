import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as RegionService from '../services/region.service';
import type { RegionLevel } from '@prisma/client';

export async function listByLevel(req: Request, res: Response, next: NextFunction) {
  try {
    const level = z.enum(['NONE', 'CITY', 'PROVINCE', 'DISTRICT'])
      .parse(req.query.level ?? 'NONE') as RegionLevel;
    const regions = await RegionService.listRegionsByLevel(level);
    res.json(regions);
  } catch (err) {
    next(err);
  }
}
export async function listAll(req: Request, res: Response, next: NextFunction) {
  try {
    const regions = await RegionService.listAllRegions();
    res.json(regions);
  } catch (err) {
    next(err);
  }
}