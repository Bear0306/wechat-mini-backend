import { Router } from 'express';
import * as RegionController from '../../controllers/region.controller';

const router = Router();

router.get('/', RegionController.listByLevel);
router.get('/all', RegionController.listAll);

export default router;
