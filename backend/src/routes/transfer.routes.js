import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { transferSchema } from '../validators/payment.validator.js';

const router = Router();

// All transfer operations require authentication
router.use(authenticate);

// POST /api/transfers - Atomically transfer money to recipient
router.post('/', validate(transferSchema), PaymentController.transfer);

export default router;
