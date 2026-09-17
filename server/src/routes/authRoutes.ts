import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { config } from '../config.js';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/auth.js';
import { loginSchema, registerSchema } from '../validators/schemas.js';
import { registerController, loginController, logoutController, meController } from '../controllers/authController.js';

const router = Router();
const limiter = rateLimit({ windowMs: config.AUTH_RATE_LIMIT_WINDOW_MS, limit: config.AUTH_RATE_LIMIT_MAX, standardHeaders: 'draft-8', legacyHeaders: false });
router.post('/register', limiter, validateBody(registerSchema), registerController);
router.post('/login', limiter, validateBody(loginSchema), loginController);
router.get('/me', requireAuth, meController);
router.post('/logout', logoutController);
export default router;
