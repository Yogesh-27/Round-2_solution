import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { listRewardsController } from '../controllers/rewardController.js';
const router = Router();
router.use(requireAuth);
router.get('/', listRewardsController);
export default router;
