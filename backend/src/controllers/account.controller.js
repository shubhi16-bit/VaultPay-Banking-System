import { AccountService } from '../services/account.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

export class AccountController {
  /**
   * Link a bank account (Onboarding step)
   * POST /api/accounts/link
   */
  static async linkAccount(req, res, next) {
    try {
      const result = await AccountService.linkBankAccount(req.user.id, req.body);
      return ApiResponse.created(res, result, 'Bank account linked successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get primary linked account
   * GET /api/accounts/primary
   */
  static async getPrimaryAccount(req, res, next) {
    try {
      const account = await AccountService.getPrimaryAccount(req.user.id);
      if (!account) {
        return ApiResponse.error(
          res,
          'No linked bank account found. Please complete bank onboarding.',
          404
        );
      }
      return ApiResponse.success(res, account, 'Primary account retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get authoritative balance of primary account
   * GET /api/accounts/balance
   */
  static async getBalance(req, res, next) {
    try {
      const account = await AccountService.getPrimaryAccount(req.user.id);
      if (!account) {
        return ApiResponse.error(
          res,
          'No linked bank account found. Please complete bank onboarding.',
          404
        );
      }
      return ApiResponse.success(
        res,
        {
          accountId: account.accountId,
          accountNumber: account.accountNumber,
          balance: account.balance,
          currency: account.currency,
          status: account.status,
          vaultpayId: account.paymentProfile?.vaultpayId,
        },
        'Account balance retrieved successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all linked accounts
   * GET /api/accounts
   */
  static async getAllAccounts(req, res, next) {
    try {
      const accounts = await AccountService.getAllUserAccounts(req.user.id);
      return ApiResponse.success(res, accounts, 'Accounts retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}
