import { Router } from 'express';
import * as MembershipController from '../../controllers/membership.controller';

const router = Router();

router.post('/purchase', MembershipController.purchase);
router.get('/me', MembershipController.getMe);
router.get('/products', MembershipController.getProducts);

export default router;
