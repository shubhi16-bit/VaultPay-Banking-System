import { Router } from 'express';
import { QrController } from '../controllers/qr.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// All QR endpoints require authentication
router.use(authenticate);

// GET /api/qr/my-code - Alias for getting user QR code
router.get('/my-code', QrController.getMyQrCode);

// POST /api/qr/resolve - Resolve payee by QR payload or VaultPay ID
router.post('/resolve', QrController.resolvePayee);

// GET /api/qr/resolve - Resolve via query param
router.get('/resolve', QrController.resolvePayee);

export default router;
