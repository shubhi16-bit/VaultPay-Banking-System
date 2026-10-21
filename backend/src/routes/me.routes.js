import { Router } from 'express';
import { QrController } from '../controllers/qr.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// All /api/me routes require authentication
router.use(authenticate);

// GET /api/me/qr - Authenticated user's QR code & identifiers
router.get('/qr', QrController.getMyQrCode);

export default router;
