import { Router } from 'express';
import * as RegionController from '../../controllers/region.controller';

const router = Router();

router.get('/', RegionController.listByLevel);

export default router;
