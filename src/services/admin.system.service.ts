import { prisma } from '../db';

const DEFAULT_REWARD_TIERS = 'defaultRewardTiers';
const DEFAULT_RANK_LIMITS = 'defaultRankLimits';
const MEMBERSHIP_DISABLED = 'membershipDisabled';
const REWARD_RULES_ENABLED = 'rewardRulesEnabled';

export interface DefaultRewardTier {
  rankStart: number;
  rankEnd: number;
  prizeValueCent: number;
}

export interface DefaultRankLimits {
  topN: number;
  tailCount: number;
}

export async function getDefaultRewardTiers(): Promise<DefaultRewardTier[]> {
  const row = await prisma.appSetting.findUnique({ where: { key: DEFAULT_REWARD_TIERS } });
  if (!row?.valueJson) return [];
  try {
    return JSON.parse(row.valueJson) as DefaultRewardTier[];
  } catch {
    return [];
  }
}

export async function setDefaultRewardTiers(tiers: DefaultRewardTier[]) {
  return prisma.appSetting.upsert({
    where: { key: DEFAULT_REWARD_TIERS },
    update: { valueJson: JSON.stringify(tiers) },
    create: { key: DEFAULT_REWARD_TIERS, valueJson: JSON.stringify(tiers) },
  });
}

export async function getDefaultRankLimits(): Promise<DefaultRankLimits> {
  const row = await prisma.appSetting.findUnique({ where: { key: DEFAULT_RANK_LIMITS } });
  if (!row?.valueJson) return { topN: 10, tailCount: 5 };
  try {
    return JSON.parse(row.valueJson) as DefaultRankLimits;
  } catch {
    return { topN: 10, tailCount: 5 };
  }
}

export async function setDefaultRankLimits(limits: DefaultRankLimits) {
  return prisma.appSetting.upsert({
    where: { key: DEFAULT_RANK_LIMITS },
    update: { valueJson: JSON.stringify(limits) },
    create: { key: DEFAULT_RANK_LIMITS, valueJson: JSON.stringify(limits) },
  });
}

export async function isMembershipDisabled(): Promise<boolean> {
  const row = await prisma.appSetting.findUnique({ where: { key: MEMBERSHIP_DISABLED } });
  return row?.valueJson === 'true';
}

export async function setMembershipDisabled(value: boolean) {
  return prisma.appSetting.upsert({
    where: { key: MEMBERSHIP_DISABLED },
    update: { valueJson: String(value) },
    create: { key: MEMBERSHIP_DISABLED, valueJson: String(value) },
  });
}

export async function isRewardRulesEnabled(): Promise<boolean> {
  const row = await prisma.appSetting.findUnique({ where: { key: REWARD_RULES_ENABLED } });
  return row?.valueJson === 'false' ? false : true;
}

export async function setRewardRulesEnabled(value: boolean) {
  return prisma.appSetting.upsert({
    where: { key: REWARD_RULES_ENABLED },
    update: { valueJson: String(value) },
    create: { key: REWARD_RULES_ENABLED, valueJson: String(value) },
  });
}

export async function getSystemConfig() {
  const [tiers, limits, membershipDisabled, rewardRulesEnabled] = await Promise.all([
    getDefaultRewardTiers(),
    getDefaultRankLimits(),
    isMembershipDisabled(),
    isRewardRulesEnabled(),
  ]);
  return {
    defaultRewardTiers: tiers,
    defaultRankLimits: limits,
    membershipDisabled,
    rewardRulesEnabled,
  };
}
