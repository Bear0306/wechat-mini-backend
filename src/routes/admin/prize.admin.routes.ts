import { Router } from 'express';
import * as PrizeController from '../../controllers/prize.controller';

const router = Router();

router.post('/claim', PrizeController.listClaims);
router.post('/verify', PrizeController.verify);
router.post('/ship', PrizeController.ship);
router.patch('/claim/:id/status', PrizeController.updateClaimStatus);

export default router;
