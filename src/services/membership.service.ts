import { prisma } from "../db";
import { MembershipTier } from "@prisma/client";
import { DateTime } from 'luxon';
import dayjs from 'dayjs';
import dayjsUtc from 'dayjs/plugin/utc';
import dayjsTz from 'dayjs/plugin/timezone';
import { env } from '../env';

dayjs.extend(dayjsUtc);
dayjs.extend(dayjsTz);

export const PLANS = [
  { id: 'SILVER_M', tier: 'SILVER', period: 'MONTH', price: 990, monthlyCredits: 4, carryOver: true, adFree: true, allowRegionSelect: false, autoJoin: false, displayName: '白银会员(月)' },
  { id: 'SILVER_Y', tier: 'SILVER', period: 'YEAR', price: 6990, monthlyCredits: 4, carryOver: true, adFree: true, allowRegionSelect: false, autoJoin: false, displayName: '白银会员(年)' },
  { id: 'GOLD_M', tier: 'GOLD', period: 'MONTH', price: 19990, monthlyCredits: 20, carryOver: true, adFree: true, allowRegionSelect: true, autoJoin: true, displayName: '黄金会员(月)' },
  { id: 'GOLD_Y', tier: 'GOLD', period: 'YEAR', price: 19990, monthlyCredits: 30, carryOver: true, adFree: true, allowRegionSelect: true, autoJoin: true, displayName: '黄金会员(年)' },
] as const;

export function tierConfig(t: MembershipTier) {
    if (t === 'SILVER')
        return { monthlyQuota: 12, carryOverMax: 12, autoJoin: false };
    if (t === 'GOLD')
        return { monthlyQuota: 20, carryOverMax: 20, autoJoin: true };
    return { monthlyQuota: 0, carryOverMax: 0, autoJoin: false };
}

export async function upsertMembership(userId: string, tier: MembershipTier, months = 1) {
    const now = DateTime.now().setZone(env.tz);
    const ex = await prisma.membership.findUnique({
        where: { userId: Number(userId) }
    });

    const cfg = tierConfig(tier);
    if (!ex) {
        return prisma.membership.create({
            data: { 
                userId: Number(userId),
                tierLevel: tier,
                startAt: now.toJSDate(),
                endAt: now.plus({ months }).toJSDate(),
            }
        });
    }

    const currentEnd = DateTime.fromJSDate(ex.endAt);
    const newEnd = (currentEnd < now ? now : currentEnd).plus({ months });

    return prisma.membership.update({
        where: { userId: Number(userId) },
        data: { 
            tierLevel: tier,
            endAt: newEnd.toJSDate(),
        }
    });
}

export async function purchase(uid: number, tier: MembershipTier, months = 1) {
  const now = dayjs().tz(env.tz).toDate();
  const end = dayjs(now).tz(env.tz).add(months, 'month').toDate();
  const cfg = tierConfig(tier);
  const qty = cfg.monthlyQuota;

  await prisma.$transaction([
    prisma.membership.upsert({
      where: { userId: uid },
      update: { tierLevel: tier, startAt: now, endAt: end},
      create: { userId: uid, tierLevel: tier, startAt: now, endAt: end }
    }),
  ]);

  return { ok: true, tier, qtyGranted: qty };
}

export async function getMe(uid: number) {
  const m = await prisma.membership.findUnique({
    where: { userId: uid },
    select: { tierLevel: true, startAt: true, endAt: true},
  });

  const adFree = m?.tierLevel === MembershipTier.SILVER || m?.tierLevel === MembershipTier.GOLD;
  const allowRegionSelect = m?.tierLevel === MembershipTier.GOLD;

  return {
    tier: m?.tierLevel,
    startAt: m?.startAt ?? null,
    endAt: m?.endAt ?? null,
    adFree,
    allowRegionSelect,
  };
}

export function getProducts() {
  return PLANS;
}