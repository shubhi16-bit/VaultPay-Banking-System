import { Router } from 'express';
import authRoutes from './auth.routes.js';
import bankRoutes from './bank.routes.js';
import accountRoutes from './account.routes.js';
import transferRoutes from './transfer.routes.js';
import userRoutes from './user.routes.js';
import transactionRoutes from './transaction.routes.js';
import meRoutes from './me.routes.js';
import payeeRoutes from './payee.routes.js';
import qrRoutes from './qr.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import { testDbConnection } from '../config/db.js';
import { ApiResponse } from '../utils/apiResponse.js';

const router = Router();

// Health check endpoint
router.get('/health', async (req, res) => {
  const dbHealth = await testDbConnection();

  const healthData = {
    status: dbHealth.connected ? 'healthy' : 'degraded',
    service: 'VaultPay Banking API',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: {
      type: 'MySQL 8',
      connected: dbHealth.connected,
      ...(dbHealth.error && { error: dbHealth.error, code: dbHealth.code }),
    },
  };

  const statusCode = dbHealth.connected ? 200 : 503;
  return res.status(statusCode).json({
    success: dbHealth.connected,
    message: dbHealth.connected
      ? 'VaultPay Core API is operating normally'
      : 'VaultPay API is running, but database connection is unavailable',
    data: healthData,
  });
});

// Mount domain routes
router.use('/auth', authRoutes);
router.use('/banks', bankRoutes);
router.use('/accounts', accountRoutes);
router.use('/transfers', transferRoutes);
router.use('/users', userRoutes);
router.use('/transactions', transactionRoutes);
router.use('/me', meRoutes);
router.use('/payees', payeeRoutes);
router.use('/qr', qrRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;
