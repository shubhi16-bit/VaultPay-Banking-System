import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { searchRecipientSchema } from '../validators/payment.validator.js';

const router = Router();

// All user lookup and contact routes require authentication
router.use(authenticate);

// GET /api/users/search?q=... - Search recipients safely
router.get('/search', validate(searchRecipientSchema, 'query'), PaymentController.searchRecipients);

// GET /api/users/recent-payees - Retrieve recent payees for home/transfer page
router.get('/recent-payees', PaymentController.getRecentPayees);

export default router;
