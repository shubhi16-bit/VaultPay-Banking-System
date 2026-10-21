import { Router } from 'express';
import { QrController } from '../controllers/qr.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { resolvePayeeSchema } from '../validators/qr.validator.js';

const router = Router();

// All payee resolution endpoints require authentication
router.use(authenticate);

// GET /api/payees/:vaultpayId - Resolve payee status and eligibility
router.get('/:vaultpayId', validate(resolvePayeeSchema, 'params'), QrController.resolvePayee);

export default router;
