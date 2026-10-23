/**
 * VaultPay Transaction Service
 * 
 * Centralized service to fetch transactions and single transaction details.
 * Connects via central apiClient to live backend endpoints:
 * - GET /api/transactions
 * - GET /api/transactions/:id
 * 
 * When backend is offline, honestly serves local simulated data with clear metadata.
 */

import { apiClient } from './apiClient';
import type { Transaction } from '../types';
import { INITIAL_MOCK_TRANSACTIONS } from './mockData';

export interface TransactionsFetchResult {
  success: boolean;
  transactions: Transaction[];
  isBackendConfirmed: boolean;
  isPendingIntegration?: boolean;
  error?: string;
}

export interface SingleTransactionResult {
  success: boolean;
  transaction?: Transaction;
  isBackendConfirmed: boolean;
  isPendingIntegration?: boolean;
  error?: string;
}

class TransactionService {
  /**
   * Fetches all user transactions.
   */
  async getTransactions(): Promise<TransactionsFetchResult> {
    try {
      const response = await apiClient.get('/transactions', { timeout: 3000 });
      const data = response.data.data || response.data.transactions || response.data;
      if (Array.isArray(data)) {
        return {
          success: true,
          transactions: data,
          isBackendConfirmed: true,
        };
      }
    } catch {
      // Backend offline or endpoint pending
    }

    // Fallback to local storage / mock data
    try {
      const stored = localStorage.getItem('vaultpay_transactions');
      const list: Transaction[] = stored ? JSON.parse(stored) : INITIAL_MOCK_TRANSACTIONS;
      return {
        success: true,
        transactions: list,
        isBackendConfirmed: false,
        isPendingIntegration: true,
      };
    } catch {
      return {
        success: true,
        transactions: INITIAL_MOCK_TRANSACTIONS,
        isBackendConfirmed: false,
        isPendingIntegration: true,
      };
    }
  }

  /**
   * Fetches a single transaction by ID or reference number.
   */
  async getTransactionById(id: string): Promise<SingleTransactionResult> {
    const cleanId = id.trim();

    try {
      const response = await apiClient.get(`/transactions/${cleanId}`, { timeout: 3000 });
      const tx = response.data.data || response.data.transaction || response.data;
      if (tx && (tx.id || tx.referenceId)) {
        return {
          success: true,
          transaction: tx,
          isBackendConfirmed: true,
        };
      }
    } catch {
      // Backend offline
    }

    // Lookup in local storage
    try {
      const stored = localStorage.getItem('vaultpay_transactions');
      const list: Transaction[] = stored ? JSON.parse(stored) : INITIAL_MOCK_TRANSACTIONS;
      const found = list.find(
        (t) => t.id === cleanId || t.referenceId.toLowerCase() === cleanId.toLowerCase()
      );

      if (found) {
        return {
          success: true,
          transaction: found,
          isBackendConfirmed: false,
          isPendingIntegration: true,
        };
      }
    } catch {
      // Ignored
    }

    return {
      success: false,
      isBackendConfirmed: false,
      error: `Transaction with identifier "${cleanId}" was not found.`,
    };
  }
}

export const transactionService = new TransactionService();

