import { prisma } from "../db";
import { MembershipTier } from "@prisma/client";
import { DateTime } from 'luxon';

export function tierConfig(t: MembershipTier) {
    if (t === 'VIP')
        return {
            monthlyQuota: 12,
            carryOverMax: 12,
            autoJoin: false
        };

    if (t === 'VIP_PLUS')
        return {
            monthlyQuota: 20,
            carryOverMax: 20,
            autoJoin: true
        };

    return {
        monthlyQuota: 0,
        carryOverMax: 0,
        autoJoin: false
    };
}

export async function upsertMembership(userId: string, tier: MembershipTier, months = 1) {
    const now = DateTime.now();
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