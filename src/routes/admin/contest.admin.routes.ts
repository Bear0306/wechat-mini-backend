import { Router } from 'express';
import * as ContestController from '../../controllers/contest.controller';

const router = Router();

router.get('/', ContestController.adminList);
router.get('/:id', ContestController.adminGetById);
router.post('/', ContestController.adminCreate);
router.put('/:id', ContestController.adminUpdate);
router.delete('/:id', ContestController.adminDelete);

export default router;
