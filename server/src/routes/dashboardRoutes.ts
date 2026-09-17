import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { dashboardSummaryController } from '../controllers/dashboardController.js';
const router = Router();
router.use(requireAuth);
router.get('/summary', dashboardSummaryController);
export default router;
