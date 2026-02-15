import { Router } from "express";
import * as MeController from '../../controllers/me.controller';

const router = Router();

router.get("/getInfo", MeController.getInfo);
router.post("/updateProfile", MeController.updateProfile);
router.get("/fetchCount", MeController.fetchCount);
router.post('/stepsUpload', MeController.stepsUpload);

const multer = require('multer')

const storage = multer.diskStorage({
  destination: './public/avatars',
  filename: (req: Express.Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage })
router.post('/uploadAvatar', upload.single('file'), MeController.uploadAvatar);
export default router;
