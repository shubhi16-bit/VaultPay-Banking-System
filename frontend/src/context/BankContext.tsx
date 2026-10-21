import React, { createContext, useContext, useState, useEffect } from 'react';
import type { BankAccount, Transaction, SendPaymentPayload, AddMoneyPayload, FrequentContact } from '../types';
import { INITIAL_MOCK_BANKS, INITIAL_MOCK_TRANSACTIONS, INITIAL_MOCK_CONTACTS } from '../services/mockData';
import { isValidVaultPayId } from '../utils/formatters';

interface BankContextType {
  bankAccounts: BankAccount[];
  primaryAccount: BankAccount | null;
  transactions: Transaction[];
  contacts: FrequentContact[];
  walletBalance: number;
  totalLiquidBalance: number;
  isLoading: boolean;
  linkNewBankAccount: (data: {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    accountType: 'Savings' | 'Current';
    initialDeposit?: number;
  }) => Promise<{ success: boolean; error?: string; account?: BankAccount }>;
  sendPayment: (payload: SendPaymentPayload) => Promise<{ success: boolean; error?: string; transaction?: Transaction }>;
  addMoney: (payload: AddMoneyPayload) => Promise<{ success: boolean; error?: string; transaction?: Transaction }>;
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

  // Load banks and transactions from localStorage
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
  }, []);

  const primaryAccount = bankAccounts.find((b) => b.isPrimary) || bankAccounts[0] || null;

  // Calculate total liquid balance (wallet + all linked banks)
  const totalLiquidBalance = walletBalance + bankAccounts.reduce((sum, b) => sum + b.balance, 0);

  const refreshBalances = () => {
    // Simulated minor balance sync
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
      await new Promise((r) => setTimeout(r, 700));

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

  const sendPayment = async (payload: SendPaymentPayload): Promise<{ success: boolean; error?: string; transaction?: Transaction }> => {
    setIsLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 800));

      const { recipientVaultPayId, amount, pin, sourceBankAccountId, note } = payload;

      if (!isValidVaultPayId(recipientVaultPayId)) {
        return { success: false, error: 'Recipient must have a valid VaultPay ID (e.g. name@vault or user@vp).' };
      }

      if (isNaN(amount) || amount <= 0) {
        return { success: false, error: 'Enter a valid payment amount greater than ₹0.' };
      }

      if (!pin || pin.length < 4) {
        return { success: false, error: 'Invalid UPI/Security PIN. Please enter your 4 or 6-digit PIN.' };
      }

      const sourceBank = bankAccounts.find((b) => b.id === sourceBankAccountId);
      if (!sourceBank) {
        return { success: false, error: 'Selected payment method was not found.' };
      }

      if (sourceBank.balance < amount) {
        return {
          success: false,
          error: `Insufficient balance in ${sourceBank.bankName}. Available: ₹${sourceBank.balance.toFixed(2)}.`,
        };
      }

      // Deduct balance from bank
      const updatedBanks = bankAccounts.map((acc) => {
        if (acc.id === sourceBankAccountId) {
          return { ...acc, balance: acc.balance - amount };
        }
        return acc;
      });
      setBankAccounts(updatedBanks);
      localStorage.setItem('vaultpay_banks', JSON.stringify(updatedBanks));

      // Resolve recipient contact name if known
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
        note: note?.trim() || 'Payment via VaultPay',
        category: matchedContact?.isMerchant ? 'Shopping' : 'Transfer',
        bankAccountMasked: sourceBank.maskedAccountNumber,
        isMockData: true,
      };

      const updatedTx = [newTx, ...transactions];
      setTransactions(updatedTx);
      localStorage.setItem('vaultpay_transactions', JSON.stringify(updatedTx));

      return { success: true, transaction: newTx };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Payment failed';
      return { success: false, error: msg };
    } finally {
      setIsLoading(false);
    }
  };

  const addMoney = async (payload: AddMoneyPayload): Promise<{ success: boolean; error?: string; transaction?: Transaction }> => {
    setIsLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 800));

      const { amount, pin, bankAccountId } = payload;

      if (isNaN(amount) || amount <= 0) {
        return { success: false, error: 'Enter a valid amount to add.' };
      }

      if (!pin || pin.length < 4) {
        return { success: false, error: 'Enter a valid 4 or 6-digit security PIN.' };
      }

      const sourceBank = bankAccounts.find((b) => b.id === bankAccountId);
      if (!sourceBank) {
        return { success: false, error: 'Linked bank account not found.' };
      }

      if (sourceBank.balance < amount) {
        return { success: false, error: `Insufficient bank balance in ${sourceBank.bankName}.` };
      }

      const updatedBanks = bankAccounts.map((acc) => {
        if (acc.id === bankAccountId) {
          return { ...acc, balance: acc.balance - amount };
        }
        return acc;
      });
      setBankAccounts(updatedBanks);
      localStorage.setItem('vaultpay_banks', JSON.stringify(updatedBanks));

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
        note: 'Added to VaultPay balance',
        category: 'Top-up',
        bankAccountMasked: sourceBank.maskedAccountNumber,
        isMockData: true,
      };

      const updatedTx = [newTx, ...transactions];
      setTransactions(updatedTx);
      localStorage.setItem('vaultpay_transactions', JSON.stringify(updatedTx));

      return { success: true, transaction: newTx };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add money';
      return { success: false, error: msg };
    } finally {
      setIsLoading(false);
    }
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
        linkNewBankAccount,
        sendPayment,
        addMoney,
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
