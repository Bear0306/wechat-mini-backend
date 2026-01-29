import { Router } from 'express';
import * as RewardController from '../../controllers/reward.controller';

const router = Router();

router.post('/start', RewardController.startClaim);
router.get('/by-contest', RewardController.getByContest);
router.get('/detail', RewardController.getDetail);

export default router;
