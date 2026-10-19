import { PaymentService } from '../services/payment.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

export class PaymentController {
  /**
   * Add demo money to linked account
   * POST /api/accounts/deposit
   */
  static async deposit(req, res, next) {
    try {
      const result = await PaymentService.addDemoMoney(req.user.id, req.body);
      return ApiResponse.success(res, result, 'Simulated demo deposit successful');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Transfer funds to another VaultPay user
   * POST /api/transfers
   */
  static async transfer(req, res, next) {
    try {
      const idempotencyKey =
        req.body.idempotencyKey ||
        req.headers['idempotency-key'] ||
        req.headers['x-idempotency-key'] ||
        null;

      const result = await PaymentService.transferMoney(req.user.id, {
        ...req.body,
        idempotencyKey,
      });

      const message = result.isIdempotentReplay
        ? 'Transfer previously completed (idempotent replay)'
        : 'Money transferred successfully';

      return ApiResponse.success(res, result, message);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Search recipients by VaultPay ID, Name, Phone
   * GET /api/users/search?q=...
   */
  static async searchRecipients(req, res, next) {
    try {
      const queryStr = req.query.q;
      if (!queryStr || !queryStr.trim()) {
        return ApiResponse.error(res, 'Search query parameter "q" is required.', 400);
      }

      const recipients = await PaymentService.searchRecipients(req.user.id, queryStr);
      return ApiResponse.success(res, recipients, 'Recipients retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get recent payees (beneficiaries)
   * GET /api/users/recent-payees
   */
  static async getRecentPayees(req, res, next) {
    try {
      const limit = parseInt(req.query.limit, 10) || 8;
      const payees = await PaymentService.getRecentPayees(req.user.id, limit);
      return ApiResponse.success(res, payees, 'Recent payees retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}
