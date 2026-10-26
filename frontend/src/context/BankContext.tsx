import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { BankAccount, Transaction, SendPaymentPayload, AddMoneyPayload, FrequentContact } from '../types';
import { INITIAL_MOCK_BANKS, INITIAL_MOCK_TRANSACTIONS, INITIAL_MOCK_CONTACTS } from '../services/mockData';
import { isValidVaultPayId } from '../utils/formatters';
import { paymentService } from '../services/paymentService';

export interface PaymentResult {
  success: boolean;
  error?: string;
  transaction?: Transaction;
  isBackendConfirmed?: boolean;
  isPendingIntegration?: boolean;
  contractDetails?: {
    method: string;
    endpoint: string;
    payload: Record<string, unknown>;
  };
}

interface BankContextType {
  bankAccounts: BankAccount[];
  primaryAccount: BankAccount | null;
  transactions: Transaction[];
  contacts: FrequentContact[];
  walletBalance: number;
  totalLiquidBalance: number;
  isLoading: boolean;
  isBackendOnline: boolean;
  checkBackendHealth: () => Promise<boolean>;
  linkNewBankAccount: (data: {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    accountType: 'Savings' | 'Current';
    initialDeposit?: number;
  }) => Promise<{ success: boolean; error?: string; account?: BankAccount }>;
  unlinkBankAccount: (accountId: string) => Promise<{ success: boolean; error?: string }>;
  sendPayment: (payload: SendPaymentPayload) => Promise<PaymentResult>;
  addMoney: (payload: AddMoneyPayload) => Promise<PaymentResult>;
  simulateOfflineSandboxPayment: (payload: SendPaymentPayload) => PaymentResult;
  simulateOfflineSandboxDeposit: (payload: AddMoneyPayload) => PaymentResult;
  setPrimaryAccount: (accountId: string) => void;
  getTransactionById: (id: string) => Transaction | undefined;
  refreshBalances: () => void;
}

const BankContext = createContext<BankContextType | undefined>(undefined);

export const BankProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [contacts] = useState<FrequentContact[]>(INITIAL_MOCK_CONTACTS);
  const [walletBalance, setWalletBalance] = useState<number>(7500.00);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isBackendOnline, setIsBackendOnline] = useState<boolean>(false);

  const checkBackendHealth = useCallback(async (): Promise<boolean> => {
    const health = await paymentService.checkBackendHealth();
    setIsBackendOnline(health.online);
    return health.online;
  }, []);

  // Initial load
  useEffect(() => {
    try {
      const storedBanks = localStorage.getItem('vaultpay_banks');
      const storedTx = localStorage.getItem('vaultpay_transactions');
      const storedWallet = localStorage.getItem('vaultpay_wallet');

      if (storedBanks) {
        setBankAccounts(JSON.parse(storedBanks));
      } else {
        setBankAccounts(INITIAL_MOCK_BANKS);
        localStorage.setItem('vaultpay_banks', JSON.stringify(INITIAL_MOCK_BANKS));
      }

      if (storedTx) {
        setTransactions(JSON.parse(storedTx));
      } else {
        setTransactions(INITIAL_MOCK_TRANSACTIONS);
        localStorage.setItem('vaultpay_transactions', JSON.stringify(INITIAL_MOCK_TRANSACTIONS));
      }

      if (storedWallet) {
        setWalletBalance(parseFloat(storedWallet));
      } else {
        setWalletBalance(7500.00);
        localStorage.setItem('vaultpay_wallet', '7500.00');
      }
    } catch {
      setBankAccounts(INITIAL_MOCK_BANKS);
      setTransactions(INITIAL_MOCK_TRANSACTIONS);
    } finally {
      setIsLoading(false);
    }

    // Check backend health asynchronously
    checkBackendHealth();
  }, [checkBackendHealth]);

  const primaryAccount = bankAccounts.find((b) => b.isPrimary) || bankAccounts[0] || null;

  // Total liquid balance across wallet + linked accounts
  const totalLiquidBalance = walletBalance + bankAccounts.reduce((sum, b) => sum + b.balance, 0);

  const refreshBalances = () => {
    const storedBanks = localStorage.getItem('vaultpay_banks');
    if (storedBanks) {
      setBankAccounts(JSON.parse(storedBanks));
    }
  };

  const setPrimaryAccount = (accountId: string) => {
    const updated = bankAccounts.map((acc) => ({
      ...acc,
      isPrimary: acc.id === accountId,
    }));
    setBankAccounts(updated);
    localStorage.setItem('vaultpay_banks', JSON.stringify(updated));
  };

  const linkNewBankAccount = async (data: {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    accountType: 'Savings' | 'Current';
    initialDeposit?: number;
  }): Promise<{ success: boolean; error?: string; account?: BankAccount }> => {
    setIsLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 600));

      const cleanAcc = data.accountNumber.replace(/\s+/g, '');
      if (cleanAcc.length < 8) {
        return { success: false, error: 'Account number must contain at least 8 digits.' };
      }

      const masked = `•••• ${cleanAcc.slice(-4)}`;
      const isFirst = bankAccounts.length === 0;

      const newAccount: BankAccount = {
        id: `bank_${Date.now()}`,
        userId: 'usr_current',
        bankName: data.bankName,
        bankCode: data.bankName.slice(0, 4).toUpperCase(),
        accountNumber: cleanAcc,
        maskedAccountNumber: masked,
        ifscCode: data.ifscCode.toUpperCase(),
        accountType: data.accountType,
        isPrimary: isFirst,
        balance: data.initialDeposit !== undefined ? data.initialDeposit : 25000.00,
        linkedAt: new Date().toISOString(),
      };

      const updatedAccounts = [...bankAccounts, newAccount];
      setBankAccounts(updatedAccounts);
      localStorage.setItem('vaultpay_banks', JSON.stringify(updatedAccounts));

      return { success: true, account: newAccount };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to link account';
      return { success: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  };

  const unlinkBankAccount = async (accountId: string): Promise<{ success: boolean; error?: string }> => {
    if (bankAccounts.length <= 1) {
      return {
        success: false,
        error: 'You must maintain at least one linked bank account to use VaultPay.',
      };
    }

    const updated = bankAccounts.filter((b) => b.id !== accountId);
    const hasPrimary = updated.some((b) => b.isPrimary);
    if (!hasPrimary && updated.length > 0) {
      updated[0].isPrimary = true;
    }

    setBankAccounts(updated);
    localStorage.setItem('vaultpay_banks', JSON.stringify(updated));
    return { success: true };
  };

  /**
   * Phase 3 Core: Send Payment
   * Strict adherence to backend confirmation mandate:
   * 1. Validates input client-side (amount, recipient format, PIN, balance).
   * 2. Calls live backend via paymentService.executePayment().
   * 3. Only updates local balances upon confirmed backend response.
   * 4. Reports honest integration-pending state if backend is offline.
   */
  const sendPayment = async (payload: SendPaymentPayload): Promise<PaymentResult> => {
    const { recipientVaultPayId, amount, pin, sourceBankAccountId } = payload;

    if (!isValidVaultPayId(recipientVaultPayId)) {
      return {
        success: false,
        error: 'Recipient must have a valid VaultPay ID (e.g. name@vault or user@vp).',
      };
    }

    if (isNaN(amount) || amount <= 0) {
      return {
        success: false,
        error: 'Please enter a valid payment amount greater than ₹0.',
      };
    }

    if (!pin || pin.length < 4) {
      return {
        success: false,
        error: 'Please enter your 4 or 6-digit security PIN to authorize this transfer.',
      };
    }

    const sourceBank = bankAccounts.find((b) => b.id === sourceBankAccountId) || primaryAccount;
    if (!sourceBank) {
      return {
        success: false,
        error: 'Selected bank account was not found. Please link a bank account.',
      };
    }

    if (sourceBank.balance < amount) {
      return {
        success: false,
        error: `Insufficient balance in ${sourceBank.bankName}. Available: ₹${sourceBank.balance.toFixed(2)}.`,
      };
    }

    // Call live backend API via paymentService
    const apiResult = await paymentService.executePayment({
      ...payload,
      sourceBankAccountId: sourceBank.id,
    });

    if (apiResult.success && apiResult.transaction && apiResult.isBackendConfirmed) {
      // Deduct balance ONLY when confirmed by live backend
      const updatedBanks = bankAccounts.map((acc) => {
        if (acc.id === sourceBank.id) {
          return { ...acc, balance: acc.balance - amount };
        }
        return acc;
      });
      setBankAccounts(updatedBanks);
      localStorage.setItem('vaultpay_banks', JSON.stringify(updatedBanks));

      const updatedTx = [apiResult.transaction, ...transactions];
      setTransactions(updatedTx);
      localStorage.setItem('vaultpay_transactions', JSON.stringify(updatedTx));

      setIsBackendOnline(true);
      return {
        success: true,
        transaction: apiResult.transaction,
        isBackendConfirmed: true,
      };
    }

    // Backend is offline or endpoint not yet deployed by teammate
    if (apiResult.isPendingIntegration) {
      setIsBackendOnline(false);
      return {
        success: false,
        isBackendConfirmed: false,
        isPendingIntegration: true,
        error: apiResult.error,
        contractDetails: apiResult.contractDetails,
      };
    }

    return {
      success: false,
      error: apiResult.error || 'Payment rejected by backend.',
      isBackendConfirmed: true,
    };
  };

  /**
   * Phase 3 Core: Demo-money deposits
   * Uses backend deposit endpoint if reachable.
   * Does NOT increase balance unless backend confirms the operation.
   */
  const addMoney = async (payload: AddMoneyPayload): Promise<PaymentResult> => {
    const { amount, pin, bankAccountId } = payload;

    if (isNaN(amount) || amount <= 0) {
      return { success: false, error: 'Enter a valid amount to deposit.' };
    }

    if (!pin || pin.length < 4) {
      return { success: false, error: 'Enter your 4 or 6-digit security PIN.' };
    }

    const sourceBank = bankAccounts.find((b) => b.id === bankAccountId) || primaryAccount;
    if (!sourceBank) {
      return { success: false, error: 'Linked source bank account not found.' };
    }

    if (sourceBank.balance < amount) {
      return {
        success: false,
        error: `Insufficient balance in ${sourceBank.bankName}. Available: ₹${sourceBank.balance.toFixed(2)}.`,
      };
    }

    const apiResult = await paymentService.depositDemoMoney({
      amount,
      bankAccountId: sourceBank.id,
      pin,
    });

    if (apiResult.success && apiResult.transaction && apiResult.isBackendConfirmed) {
      // Balance only increased upon backend confirmation
      const newWalletBalance = walletBalance + amount;
      setWalletBalance(newWalletBalance);
      localStorage.setItem('vaultpay_wallet', newWalletBalance.toString());

      const updatedTx = [apiResult.transaction, ...transactions];
      setTransactions(updatedTx);
      localStorage.setItem('vaultpay_transactions', JSON.stringify(updatedTx));

      setIsBackendOnline(true);
      return {
        success: true,
        transaction: apiResult.transaction,
        isBackendConfirmed: true,
      };
    }

    if (apiResult.isPendingIntegration) {
      setIsBackendOnline(false);
      return {
        success: false,
        isBackendConfirmed: false,
        isPendingIntegration: true,
        error: apiResult.error,
        contractDetails: apiResult.contractDetails,
      };
    }

    return {
      success: false,
      error: apiResult.error || 'Deposit failed.',
      isBackendConfirmed: true,
    };
  };

  /**
   * Explicit offline sandbox simulation
   * Provided strictly for development preview and testing UI screens
   * when teammate backend is offline. Transactions are explicitly marked `isMockData: true`.
   */
  const simulateOfflineSandboxPayment = (payload: SendPaymentPayload): PaymentResult => {
    const { recipientVaultPayId, amount, sourceBankAccountId, note } = payload;
    const sourceBank = bankAccounts.find((b) => b.id === sourceBankAccountId) || primaryAccount;

    if (!sourceBank) {
      return { success: false, error: 'Payment method not found.' };
    }

    const matchedContact = contacts.find((c) => c.vaultPayId.toLowerCase() === recipientVaultPayId.toLowerCase());
    const recipientName = matchedContact?.name || recipientVaultPayId.split('@')[0].toUpperCase();

    const randomSuffix = Math.floor(1000000000 + Math.random() * 9000000000);
    const newTx: Transaction = {
      id: `tx_${Date.now()}`,
      referenceId: `VPY${randomSuffix}`,
      type: 'SEND',
      amount: amount,
      currency: 'INR',
      senderName: 'Alex Sharma',
      senderVaultPayId: 'alex@vault',
      recipientName,
      recipientVaultPayId: recipientVaultPayId.toLowerCase(),
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
      note: note?.trim() || 'Simulated Offline Transfer',
      category: matchedContact?.isMerchant ? 'Shopping' : 'Transfer',
      bankAccountMasked: sourceBank.maskedAccountNumber,
      isMockData: true,
    };

    const updatedBanks = bankAccounts.map((acc) => {
      if (acc.id === sourceBank.id) {
        return { ...acc, balance: acc.balance - amount };
      }
      return acc;
    });
    setBankAccounts(updatedBanks);
    localStorage.setItem('vaultpay_banks', JSON.stringify(updatedBanks));

    const updatedTx = [newTx, ...transactions];
    setTransactions(updatedTx);
    localStorage.setItem('vaultpay_transactions', JSON.stringify(updatedTx));

    return { success: true, transaction: newTx, isBackendConfirmed: false };
  };

  const simulateOfflineSandboxDeposit = (payload: AddMoneyPayload): PaymentResult => {
    const { amount, bankAccountId } = payload;
    const sourceBank = bankAccounts.find((b) => b.id === bankAccountId) || primaryAccount;

    if (!sourceBank) {
      return { success: false, error: 'Source bank account not found.' };
    }

    const newWalletBalance = walletBalance + amount;
    setWalletBalance(newWalletBalance);
    localStorage.setItem('vaultpay_wallet', newWalletBalance.toString());

    const randomSuffix = Math.floor(1000000000 + Math.random() * 9000000000);
    const newTx: Transaction = {
      id: `tx_${Date.now()}`,
      referenceId: `VPY${randomSuffix}`,
      type: 'ADD_MONEY',
      amount: amount,
      currency: 'INR',
      senderName: `${sourceBank.bankName} (${sourceBank.maskedAccountNumber})`,
      senderVaultPayId: `bank@${sourceBank.bankCode.toLowerCase()}`,
      recipientName: 'VaultPay Wallet',
      recipientVaultPayId: 'wallet@vault',
      timestamp: new Date().toISOString(),
      status: 'SUCCESS',
      note: 'Simulated Sandbox Deposit',
      category: 'Top-up',
      bankAccountMasked: sourceBank.maskedAccountNumber,
      isMockData: true,
    };

    const updatedTx = [newTx, ...transactions];
    setTransactions(updatedTx);
    localStorage.setItem('vaultpay_transactions', JSON.stringify(updatedTx));

    return { success: true, transaction: newTx, isBackendConfirmed: false };
  };

  const getTransactionById = (id: string): Transaction | undefined => {
    return transactions.find((t) => t.id === id || t.referenceId === id);
  };

  return (
    <BankContext.Provider
      value={{
        bankAccounts,
        primaryAccount,
        transactions,
        contacts,
        walletBalance,
        totalLiquidBalance,
        isLoading,
        isBackendOnline,
        checkBackendHealth,
        linkNewBankAccount,
        unlinkBankAccount,
        sendPayment,
        addMoney,
        simulateOfflineSandboxPayment,
        simulateOfflineSandboxDeposit,
        setPrimaryAccount,
        getTransactionById,
        refreshBalances,
      }}
    >
      {children}
    </BankContext.Provider>
  );
};

export const useBank = (): BankContextType => {
  const context = useContext(BankContext);
  if (!context) {
    throw new Error('useBank must be used within a BankProvider');
  }
  return context;
};
