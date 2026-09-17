import { Router } from 'express';
import { postClockController } from '../controllers/clockController.js';

const router = Router();
router.post('/', postClockController);
export default router;
