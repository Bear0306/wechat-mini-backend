import { Router } from 'express';
import * as AdminUserController from '../../controllers/admin.user.controller';

const router = Router();

router.get('/:id', AdminUserController.getUserById);
router.put('/:id', AdminUserController.updateUser);

export default router;
