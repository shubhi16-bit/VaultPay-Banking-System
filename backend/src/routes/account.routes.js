import { Router } from 'express';
import { AccountController } from '../controllers/account.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { linkAccountSchema } from '../validators/account.validator.js';

const router = Router();

// All bank account operations require authentication
router.use(authenticate);

router.post('/link', validate(linkAccountSchema), AccountController.linkAccount);
router.get('/primary', AccountController.getPrimaryAccount);
router.get('/balance', AccountController.getBalance);
router.get('/', AccountController.getAllAccounts);

export default router;
