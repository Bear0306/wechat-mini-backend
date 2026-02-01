import { Router } from 'express';
import * as AdminLeaderboardController from '../../controllers/admin.leaderboard.controller';

const router = Router();

router.get('/contest/:contestId', AdminLeaderboardController.getContestRanking);

export default router;
