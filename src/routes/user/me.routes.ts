import { Router } from "express";
import * as MeController from '../../controllers/me.controller';

const router = Router();

router.get("/getInfo", MeController.getInfo);
router.get("/fetchCount", MeController.fetchCount);
router.post('/stepsUpload', MeController.stepsUpload);

export default router;
