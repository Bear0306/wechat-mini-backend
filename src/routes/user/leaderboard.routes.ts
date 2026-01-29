import { Router } from 'express';
import * as LeaderboardController from '../../controllers/leaderboard.controller';

const router = Router();

router.get('/list', LeaderboardController.getList);
router.get('/my-rank', LeaderboardController.getMyRank);
router.get('/snapshot', LeaderboardController.getSnapshot);

export default router;
