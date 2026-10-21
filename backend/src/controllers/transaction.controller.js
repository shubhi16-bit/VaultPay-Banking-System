import { TransactionService } from '../services/transaction.service.js';
import { ReceiptService } from '../services/receipt.service.js';
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

      // If client requests PDF format directly on transaction detail
      if (req.query.format === 'pdf' || req.headers.accept?.includes('application/pdf')) {
        return TransactionController.getTransactionReceipt(req, res, next);
      }

      const transaction = await TransactionService.getTransactionById(req.user.id, id);
      return ApiResponse.success(res, transaction, 'Transaction details retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get full payment receipt (JSON or downloadable PDF)
   * GET /api/transactions/:id/receipt
   */
  static async getTransactionReceipt(req, res, next) {
    try {
      const { id } = req.params;
      if (!id) {
        return ApiResponse.error(res, 'Transaction ID or reference ID is required.', 400);
      }

      const receipt = await ReceiptService.getReceiptData(req.user.id, id);

      // Handle PDF generation request
      if (req.query.format === 'pdf' || req.headers.accept?.includes('application/pdf')) {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="vaultpay-receipt-${receipt.referenceId}.pdf"`
        );
        return ReceiptService.generateReceiptPdf(receipt, res);
      }

      // Default JSON response
      return ApiResponse.success(res, receipt, 'Transaction receipt retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}
