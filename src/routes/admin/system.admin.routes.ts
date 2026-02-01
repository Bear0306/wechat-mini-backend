import { Router } from 'express';
import * as AdminSystemController from '../../controllers/admin.system.controller';

const router = Router();

router.get('/', AdminSystemController.getConfig);
router.put('/', AdminSystemController.updateConfig);

export default router;
