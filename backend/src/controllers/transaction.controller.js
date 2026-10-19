import { TransactionService } from '../services/transaction.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

export class TransactionController {
  /**
   * Get paginated transaction history
   * GET /api/transactions
   */
  static async getTransactions(req, res, next) {
    try {
      const result = await TransactionService.getTransactions(req.user.id, req.query);
      return ApiResponse.paginated(
        res,
        result.items,
        result.pagination,
        'Transactions retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get transaction details by ID or reference ID
   * GET /api/transactions/:id
   */
  static async getTransactionById(req, res, next) {
    try {
      const { id } = req.params;
      if (!id) {
        return ApiResponse.error(res, 'Transaction ID or reference ID is required.', 400);
      }

      const transaction = await TransactionService.getTransactionById(req.user.id, id);
      return ApiResponse.success(res, transaction, 'Transaction details retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}
