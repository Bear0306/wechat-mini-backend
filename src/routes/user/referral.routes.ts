import { Router } from 'express';
import * as ReferralController from '../../controllers/referral.controller';

const router = Router();

router.get('/code', ReferralController.getCode);
router.post('/accept', ReferralController.accept);
router.post('/bind', ReferralController.bind);
router.get('/multiplier', ReferralController.getMultiplier);

export default router;
