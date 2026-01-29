import { DateTime } from 'luxon';
import { AgeGroup } from '@prisma/client';
import { env } from '../env';

export function classifyAgeGroup(b?: Date) {
    if (!b)
        return {
            group: AgeGroup.ADULT,
            canParticipate: true,
            canBuyMembership: true
        };

    const now = DateTime.now().setZone(env.tz);
    const age = Math.floor(now.diff(DateTime.fromJSDate(b), 'years').years);
    
    // 年龄判断逻辑
    if(age < 12)
        return {
            group: AgeGroup.BLOCKED_UNDER_12,
            canParticipate:false,
            canBuyMembership:false
        };
        
    if(age <= 18)
        return {
            group: AgeGroup.MINOR_12_18,
            canParticipate: true,
            canBuyMembership: false
        };
        
    if(age > 65)
        return { 
            group: AgeGroup.SENIOR_65_PLUS,
            canParticipate: false,
            canBuyMembership: false
        };
        
    if(age > 60)
        return {
            group: AgeGroup.SENIOR_60_65,
            canParticipate: true,
            canBuyMembership: false
        };
        
    return {
        group: AgeGroup.ADULT,
        canParticipate: true,
        canBuyMembership: true
    };
}