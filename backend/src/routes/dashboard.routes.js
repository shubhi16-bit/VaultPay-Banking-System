import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { dashboardAnalyticsQuerySchema } from '../validators/dashboard.validator.js';

const router = Router();

// All dashboard endpoints require authentication
router.use(authenticate);

// GET /api/dashboard/summary - Authoritative balance, totals, primary bank, recent txns
router.get('/summary', DashboardController.getSummary);

// GET /api/dashboard/analytics - Cash flow trends and category breakdown
router.get('/analytics', validate(dashboardAnalyticsQuerySchema, 'query'), DashboardController.getAnalytics);

export default router;
