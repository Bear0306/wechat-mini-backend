import { prisma } from '../db';
import type { RegionLevel } from '@prisma/client';

export type RegionRow = {
  code: string;
  name: string;
  level: RegionLevel;
};

export async function listRegionsByLevel(level: RegionLevel): Promise<RegionRow[]> {
  const regions = await prisma.region.findMany({
    where: { level },
    select: { code: true, name: true, level: true },
    orderBy: [{ name: 'asc' }],
  });
  return regions;
}


export async function listAllRegions(): Promise<RegionRow[]> {
  const regions = await prisma.region.findMany({
    select: { code: true, name: true, level: true },
    orderBy: [{ code: 'asc' }],
  });
  return regions;
}
