/**
 * VaultPay Payment and Recipient Service
 * 
 * Centralized service implementing Phase 3 requirements:
 * 1. Recipient lookup and validation via backend API with fallback directory lookup.
 * 2. Payment execution via central apiClient (POST /api/payments).
 * 3. Demo money deposit via central apiClient (POST /api/wallet/deposit).
 * 4. Honest reporting of backend confirmation vs. integration-pending states.
 * 5. Strict prevention of fake successes or unverified balance increments.
 */

import { apiClient } from './apiClient';
import type { SendPaymentPayload, AddMoneyPayload, Transaction } from '../types';
import { INITIAL_MOCK_CONTACTS } from './mockData';

export interface RecipientLookupResult {
  found: boolean;
  recipient?: {
    vaultPayId: string;
    name: string;
    phone?: string;
    initials: string;
    avatarBg: string;
    avatarColor: string;
    isMerchant?: boolean;
  };
  isBackendConfirmed: boolean;
  isPendingIntegration?: boolean;
  source: 'backend' | 'demo_directory' | 'none';
  error?: string;
}

export interface PaymentExecutionResult {
  success: boolean;
  transaction?: Transaction;
  isBackendConfirmed: boolean;
  isPendingIntegration?: boolean;
  error?: string;
  contractDetails?: {
    method: string;
    endpoint: string;
    payload: Record<string, unknown>;
  };
}

export interface DepositExecutionResult {
  success: boolean;
  transaction?: Transaction;
  isBackendConfirmed: boolean;
  isPendingIntegration?: boolean;
  error?: string;
  contractDetails?: {
    method: string;
    endpoint: string;
    payload: Record<string, unknown>;
  };
}

class PaymentService {
  /**
   * Probes backend API health to check if teammate's server is currently running.
   */
  async checkBackendHealth(): Promise<{ online: boolean; message: string }> {
    try {
      // Short timeout (2 seconds) to avoid hanging
      const response = await apiClient.get('/health', { timeout: 2000 });
      if (response.status >= 200 && response.status < 300) {
        return { online: true, message: 'Live backend server connected' };
      }
      return { online: false, message: 'Backend returned non-success status' };
    } catch {
      return {
        online: false,
        message: 'Backend server is offline (http://localhost:5000/api)',
      };
    }
  }

  /**
   * Looks up and validates a recipient VaultPay ID.
   * Tries live backend endpoint first (GET /api/users/lookup?vaultPayId=...).
   * If backend is offline, falls back honestly to the known demo directory.
   */
  async lookupRecipient(vaultPayId: string): Promise<RecipientLookupResult> {
    const cleanId = vaultPayId.trim().toLowerCase();

    // 1. Attempt live backend lookup
    try {
      const response = await apiClient.get('/users/lookup', {
        params: { vaultPayId: cleanId },
        timeout: 3000,
      });

      if (response.data && (response.data.data || response.data.user)) {
        const u = response.data.data || response.data.user;
        return {
          found: true,
          recipient: {
            vaultPayId: u.vaultPayId || cleanId,
            name: u.name || 'VaultPay Recipient',
            phone: u.phone,
            initials: (u.name || 'VP').slice(0, 2).toUpperCase(),
            avatarBg: 'bg-indigo-600',
            avatarColor: 'text-white',
            isMerchant: Boolean(u.isMerchant),
          },
          isBackendConfirmed: true,
          source: 'backend',
        };
      }
    } catch {
      // Backend is offline or endpoint not yet implemented
    }

    // 2. Fallback to known local demo directory
    const matched = INITIAL_MOCK_CONTACTS.find(
      (c) => c.vaultPayId.toLowerCase() === cleanId
    );

    if (matched) {
      return {
        found: true,
        recipient: {
          vaultPayId: matched.vaultPayId,
          name: matched.name,
          phone: matched.phone,
          initials: matched.initials,
          avatarBg: matched.avatarBg,
          avatarColor: matched.avatarColor,
          isMerchant: matched.isMerchant,
        },
        isBackendConfirmed: false,
        isPendingIntegration: true,
        source: 'demo_directory',
      };
    }

    // Recipient not in demo directory and backend is offline
    return {
      found: false,
      isBackendConfirmed: false,
      isPendingIntegration: true,
      source: 'none',
      error: `Recipient "${cleanId}" was not found in the local demo directory. Teammate backend (GET /api/users/lookup) is required to query live users.`,
    };
  }

  /**
   * Executes a payment.
   * Attempts live backend POST /api/payments.
   * If backend is offline, returns an honest integration-pending state.
   */
  async executePayment(payload: SendPaymentPayload): Promise<PaymentExecutionResult> {
    try {
      const response = await apiClient.post('/payments', payload, { timeout: 5000 });

      if (response.status === 200 || response.status === 201) {
        const txData = response.data.data || response.data.transaction || response.data;
        return {
          success: true,
          transaction: {
            id: txData.id || `tx_${Date.now()}`,
            referenceId: txData.referenceId || `VPY${Math.floor(1000000000 + Math.random() * 9000000000)}`,
            type: 'SEND',
            amount: payload.amount,
            currency: 'INR',
            senderName: txData.senderName || 'Alex Sharma',
            senderVaultPayId: txData.senderVaultPayId || 'alex@vault',
            recipientName: txData.recipientName || payload.recipientVaultPayId,
            recipientVaultPayId: payload.recipientVaultPayId.toLowerCase(),
            timestamp: txData.timestamp || new Date().toISOString(),
            status: 'SUCCESS',
            note: payload.note || 'Payment via VaultPay',
            category: 'Transfer',
            bankAccountMasked: txData.bankAccountMasked || '•••• 9104',
            isMockData: false,
          },
          isBackendConfirmed: true,
        };
      }

      return {
        success: false,
        isBackendConfirmed: true,
        error: response.data?.message || 'Payment rejected by backend.',
      };
    } catch (err: unknown) {
      // Backend is unreachable or returned network error
      const message = err instanceof Error ? err.message : 'Backend offline';
      return {
        success: false,
        isBackendConfirmed: false,
        isPendingIntegration: true,
        error: `Backend offline or endpoint unreachable: ${message}. Payment was not debited.`,
        contractDetails: {
          method: 'POST',
          endpoint: '/api/payments',
          payload: {
            recipientVaultPayId: payload.recipientVaultPayId,
            amount: payload.amount,
            note: payload.note,
            sourceBankAccountId: payload.sourceBankAccountId,
            pin: '•••• (masked)',
          },
        },
      };
    }
  }

  /**
   * Deposits demo money to user's balance.
   * Attempts live backend POST /api/wallet/deposit.
   * If backend is offline, returns an honest integration-pending state.
   */
  async depositDemoMoney(payload: AddMoneyPayload): Promise<DepositExecutionResult> {
    try {
      const response = await apiClient.post('/wallet/deposit', payload, { timeout: 5000 });

      if (response.status === 200 || response.status === 201) {
        const txData = response.data.data || response.data.transaction || response.data;
        return {
          success: true,
          transaction: {
            id: txData.id || `tx_${Date.now()}`,
            referenceId: txData.referenceId || `VPY${Math.floor(1000000000 + Math.random() * 9000000000)}`,
            type: 'ADD_MONEY',
            amount: payload.amount,
            currency: 'INR',
            senderName: txData.senderName || 'Linked Bank Account',
            senderVaultPayId: 'bank@vault',
            recipientName: 'VaultPay Wallet',
            recipientVaultPayId: 'wallet@vault',
            timestamp: txData.timestamp || new Date().toISOString(),
            status: 'SUCCESS',
            note: 'Added to VaultPay balance',
            category: 'Top-up',
            bankAccountMasked: '•••• 9104',
            isMockData: false,
          },
          isBackendConfirmed: true,
        };
      }

      return {
        success: false,
        isBackendConfirmed: true,
        error: response.data?.message || 'Deposit rejected by backend.',
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Backend offline';
      return {
        success: false,
        isBackendConfirmed: false,
        isPendingIntegration: true,
        error: `Backend deposit endpoint unreachable: ${message}. Balance cannot be updated without backend confirmation.`,
        contractDetails: {
          method: 'POST',
          endpoint: '/api/wallet/deposit',
          payload: {
            amount: payload.amount,
            bankAccountId: payload.bankAccountId,
            pin: '•••• (masked)',
          },
        },
      };
    }
  }
}

export const paymentService = new PaymentService();
