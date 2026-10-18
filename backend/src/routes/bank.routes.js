import { Router } from 'express';
import { BankController } from '../controllers/bank.controller.js';

const router = Router();

// Public bank listings for onboarding
router.get('/', BankController.getBanks);
router.get('/:id', BankController.getBankById);

export default router;
