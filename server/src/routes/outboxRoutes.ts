import { Router } from 'express';
import { acknowledgeOutboxController, listOutboxController } from '../controllers/outboxController.js';

const router = Router();
router.get('/', listOutboxController);
router.post('/', acknowledgeOutboxController);
export default router;
