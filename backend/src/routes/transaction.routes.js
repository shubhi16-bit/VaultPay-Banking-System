import { Router } from 'express';
import { TransactionController } from '../controllers/transaction.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { transactionQuerySchema } from '../validators/payment.validator.js';

const router = Router();

// All transaction queries require authentication
router.use(authenticate);

// GET /api/transactions - Paginated and filtered transaction history
router.get('/', validate(transactionQuerySchema, 'query'), TransactionController.getTransactions);

// GET /api/transactions/:id - Detailed transaction receipt
router.get('/:id', TransactionController.getTransactionById);

export default router;
