import { Request, Response, NextFunction } from 'express';
import * as AdminSystemService from '../services/admin.system.service';

export async function getConfig(req: Request, res: Response, next: NextFunction) {
  try {
    const config = await AdminSystemService.getSystemConfig();
    res.json(config);
  } catch (e) {
    next(e);
  }
}

export async function updateConfig(req: Request, res: Response, next: NextFunction) {
  const body = req.body ?? {};
  try {
    if (body.defaultRewardTiers != null) {
      await AdminSystemService.setDefaultRewardTiers(body.defaultRewardTiers);
    }
    if (body.defaultRankLimits != null) {
      await AdminSystemService.setDefaultRankLimits(body.defaultRankLimits);
    }
    if (body.membershipDisabled != null) {
      await AdminSystemService.setMembershipDisabled(Boolean(body.membershipDisabled));
    }
    if (body.rewardRulesEnabled != null) {
      await AdminSystemService.setRewardRulesEnabled(Boolean(body.rewardRulesEnabled));
    }
    const config = await AdminSystemService.getSystemConfig();
    res.json(config);
  } catch (e) {
    next(e);
  }
}
