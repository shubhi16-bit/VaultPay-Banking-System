import { AdminService } from '../services/admin.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

export class AdminController {
  /**
   * List registered users with account summaries and balances
   * GET /api/admin/users
   */
  static async getUsers(req, res, next) {
    try {
      const result = await AdminService.getUsers(req.query);
      return ApiResponse.paginated(
        res,
        result.items,
        result.pagination,
        'Users retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Freeze or unfreeze an account with required reason
   * PATCH /api/admin/accounts/:id/status
   */
  static async updateAccountStatus(req, res, next) {
    try {
      const { id } = req.params;
      const accountId = parseInt(id, 10);
      if (isNaN(accountId) || accountId <= 0) {
        return ApiResponse.error(res, 'Valid account ID is required in URL parameter.', 400);
      }

      const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      const updatedAccount = await AdminService.updateAccountStatus(
        req.user,
        accountId,
        req.body,
        clientIp
      );

      return ApiResponse.success(
        res,
        updatedAccount,
        `Bank account successfully marked as ${updatedAccount.status}`
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * List system audit logs
   * GET /api/admin/audit-logs
   */
  static async getAuditLogs(req, res, next) {
    try {
      const result = await AdminService.getAuditLogs(req.query);
      return ApiResponse.paginated(
        res,
        result.items,
        result.pagination,
        'Audit logs retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * System financial metrics and double-entry ledger reconciliation
   * GET /api/admin/system/metrics
   */
  static async getSystemMetrics(req, res, next) {
    try {
      const metrics = await AdminService.getSystemMetrics();
      return ApiResponse.success(
        res,
        metrics,
        'System metrics and ledger reconciliation retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }
}
