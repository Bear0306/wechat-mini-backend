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
                tier,
                startAt: now.toJSDate(),
                endAt: now.plus({ months }).toJSDate(),
                monthlyQuota: cfg.monthlyQuota,
                carryOver: 0,
                autoJoin: cfg.autoJoin
            }
        });
    }

    const carry = Math.min((ex.carryOver ?? 0) + (ex.monthlyQuota ?? 0), cfg.carryOverMax ?? 0);
    const currentEnd = DateTime.fromJSDate(ex.endAt);
    const newEnd = (currentEnd < now ? now : currentEnd).plus({ months });

    return prisma.membership.update({
        where: { userId: Number(userId) },
        data: { 
            tier,
            endAt: newEnd.toJSDate(),
            monthlyQuota: cfg.monthlyQuota,
            carryOver: carry,
            autoJoin: cfg.autoJoin
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
      update: { tier, startAt: now, endAt: end, monthlyQuota: qty },
      create: { userId: uid, tier, startAt: now, endAt: end, monthlyQuota: qty, carryOver: 0 }
    }),
    prisma.entryCredit.create({ data: { userId: uid, source: 'MEMBERSHIP', qty } })
  ]);

  return { ok: true, tier, qtyGranted: qty };
}

export async function getMe(uid: number) {
  const m = await prisma.membership.findUnique({
    where: { userId: uid },
    select: { tier: true, startAt: true, endAt: true, autoJoin: true },
  });

  const uiTier =
    m?.tier === MembershipTier.GOLD ? 'GOLD' :
    m?.tier === MembershipTier.SILVER ? 'SILVER' : 'BRONZE';

  const adFree = m?.tier === MembershipTier.SILVER || m?.tier === MembershipTier.GOLD;
  const allowRegionSelect = m?.tier === MembershipTier.GOLD;

  const credits = await prisma.entryCredit.findMany({
    where: { userId: uid },
    select: { qty: true, consumedQty: true, expiresAt: true },
  });
  const joinCount = credits.reduce(
    (acc: number, c: { qty: number; consumedQty: number }) => acc + Math.max(0, c.qty - c.consumedQty),
    0
  );

  return {
    tier: uiTier,
    startAt: m?.startAt ?? null,
    endAt: m?.endAt ?? null,
    adFree,
    allowRegionSelect,
    autoJoin: !!m?.autoJoin,
    joinCount,
  };
}

export function getProducts() {
  return PLANS;
}