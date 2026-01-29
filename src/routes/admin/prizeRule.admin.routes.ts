import { Router } from 'express';
import * as PrizeRuleController from '../../controllers/prizeRule.controller';

const router = Router();

router.get('/', PrizeRuleController.list);
router.get('/:id', PrizeRuleController.getById);
router.post('/', PrizeRuleController.create);
router.put('/:id', PrizeRuleController.update);
router.delete('/:id', PrizeRuleController.remove);

export default router;
