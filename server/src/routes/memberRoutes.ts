import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { memberCreateSchema, memberListSchema, transactionsQuerySchema, uuidParamSchema } from '../validators/schemas.js';
import { createMemberController, getMemberController, getMemberTransactionsController, listMembersController } from '../controllers/memberController.js';
import { createPurchaseController } from '../controllers/purchaseController.js';
import { createRedemptionController } from '../controllers/redemptionController.js';
import { purchaseSchema, redemptionSchema } from '../validators/schemas.js';

const router = Router();
router.use(requireAuth);
router.post('/', validateBody(memberCreateSchema), createMemberController);
router.get('/', validateQuery(memberListSchema), listMembersController);
router.get('/:id', validateParams(uuidParamSchema), getMemberController);
router.get('/:id/transactions', validateParams(uuidParamSchema), validateQuery(transactionsQuerySchema), getMemberTransactionsController);
router.post('/:id/purchases', validateParams(uuidParamSchema), validateBody(purchaseSchema), createPurchaseController);
router.post('/:id/redemptions', validateParams(uuidParamSchema), validateBody(redemptionSchema), createRedemptionController);
export default router;
