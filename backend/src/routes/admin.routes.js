import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  adminUsersQuerySchema,
  updateAccountStatusSchema,
  adminAuditLogsQuerySchema,
} from '../validators/admin.validator.js';

const router = Router();

// All admin routes strictly require JWT authentication AND database-verified admin role
router.use(authenticate, requireAdmin);

// GET /api/admin/users - User directory with linked accounts and balances
router.get('/users', validate(adminUsersQuerySchema, 'query'), AdminController.getUsers);

// PATCH /api/admin/accounts/:id/status - Freeze or unfreeze an account with required reason
router.patch(
  '/accounts/:id/status',
  validate(updateAccountStatusSchema, 'body'),
  AdminController.updateAccountStatus
);

// GET /api/admin/audit-logs - System compliance and security audit logs
router.get('/audit-logs', validate(adminAuditLogsQuerySchema, 'query'), AdminController.getAuditLogs);

// GET /api/admin/system/metrics - System-wide financial totals & double-entry ledger parity
router.get('/system/metrics', AdminController.getSystemMetrics);

export default router;
