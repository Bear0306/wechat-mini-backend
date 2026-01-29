import { Router } from 'express';
import * as ContestController from '../../controllers/contest.controller';

const router = Router();

router.get('/recent-list', ContestController.getRecent);
router.get('/list', ContestController.getAll);
router.get('/ended', ContestController.getEnded);
router.post('/participate', ContestController.participate);

export default router;