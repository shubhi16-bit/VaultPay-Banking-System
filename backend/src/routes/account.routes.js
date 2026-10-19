import { Router } from 'express';
import { AccountController } from '../controllers/account.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { PaymentController } from '../controllers/payment.controller.js';
import { linkAccountSchema } from '../validators/account.validator.js';
import { depositSchema } from '../validators/payment.validator.js';

const router = Router();

// All bank account operations require authentication
router.use(authenticate);

router.post('/link', validate(linkAccountSchema), AccountController.linkAccount);
router.post('/deposit', validate(depositSchema), PaymentController.deposit);
router.get('/primary', AccountController.getPrimaryAccount);
router.get('/balance', AccountController.getBalance);
router.get('/', AccountController.getAllAccounts);

export default router;
