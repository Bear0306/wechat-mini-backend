import { Router } from 'express';
import * as AdminServiceAgentController from '../../controllers/admin.serviceAgent.controller';

const router = Router();

router.get('/active', AdminServiceAgentController.listActive);
router.get('/', AdminServiceAgentController.list);
router.get('/:id', AdminServiceAgentController.getById);
router.post('/', AdminServiceAgentController.create);
router.put('/:id', AdminServiceAgentController.update);
router.delete('/:id', AdminServiceAgentController.remove);

export default router;
