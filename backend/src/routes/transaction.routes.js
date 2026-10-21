import { Router } from 'express';
import { TransactionController } from '../controllers/transaction.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { transactionQuerySchema } from '../validators/payment.validator.js';
import { receiptQuerySchema } from '../validators/receipt.validator.js';

const router = Router();

// All transaction queries require authentication
router.use(authenticate);

// GET /api/transactions - Paginated and filtered transaction history
router.get('/', validate(transactionQuerySchema, 'query'), TransactionController.getTransactions);

// GET /api/transactions/:id/receipt - Full receipt (JSON or streaming PDF)
router.get('/:id/receipt', validate(receiptQuerySchema, 'query'), TransactionController.getTransactionReceipt);

// GET /api/transactions/:id - Detailed transaction details
router.get('/:id', TransactionController.getTransactionById);

export default router;
