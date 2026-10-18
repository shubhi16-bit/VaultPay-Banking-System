import { BankService } from '../services/bank.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

export class BankController {
  /**
   * Get all active banks for onboarding selection
   * GET /api/banks
   */
  static async getBanks(req, res, next) {
    try {
      const banks = await BankService.getAllActiveBanks();
      return ApiResponse.success(res, banks, 'Banks retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get details for a specific bank
   * GET /api/banks/:id
   */
  static async getBankById(req, res, next) {
    try {
      const bankId = parseInt(req.params.id, 10);
      if (isNaN(bankId)) {
        return ApiResponse.error(res, 'Invalid bank ID parameter.', 400);
      }

      const bank = await BankService.getBankById(bankId);
      return ApiResponse.success(res, bank, 'Bank retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}
