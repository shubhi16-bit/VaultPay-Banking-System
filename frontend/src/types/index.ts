/**
 * VaultPay Core TypeScript Interfaces and Types
 */

export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  name: string;
  email: string;
  vaultPayId: string; // e.g. shubhi@vault
  phone?: string;
  role: UserRole;
  isBankLinked: boolean;
  avatarUrl?: string;
  createdAt: string;
}

export interface BankAccount {
  id: string;
  userId: string;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  maskedAccountNumber: string;
  ifscCode: string;
  accountType: 'Savings' | 'Current';
  isPrimary: boolean;
  balance: number;
  linkedAt: string;
}

export interface FrequentContact {
  id: string;
  name: string;
  vaultPayId: string;
  phone: string;
  avatarBg: string;
  avatarColor: string;
  initials: string;
  isMerchant?: boolean;
}

export type TransactionType = 'SEND' | 'RECEIVE' | 'ADD_MONEY';
export type TransactionStatus = 'SUCCESS' | 'PENDING' | 'FAILED';

export interface Transaction {
  id: string;
  referenceId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  senderName: string;
  senderVaultPayId: string;
  recipientName: string;
  recipientVaultPayId: string;
  timestamp: string;
  status: TransactionStatus;
  note?: string;
  category?: string;
  bankAccountMasked?: string;
  isMockData: boolean; // Explicit label to meet backend contract requirement
}

export interface SendPaymentPayload {
  recipientVaultPayId: string;
  amount: number;
  note?: string;
  sourceBankAccountId: string;
  pin: string;
}

export interface AddMoneyPayload {
  amount: number;
  bankAccountId: string;
  pin: string;
}

export interface SpendingCategorySummary {
  category: string;
  amount: number;
  percentage: number;
  color: string;
  count: number;
}

export interface SpendingInsight {
  totalSpentThisMonth: number;
  totalReceivedThisMonth: number;
  transactionCount: number;
  categories: SpendingCategorySummary[];
  monthlyTrend: {
    month: string;
    spent: number;
    received: number;
  }[];
}

export interface SystemStats {
  totalUsers: number;
  totalTransactionsCount: number;
  totalVolume: number;
  activeUsersToday: number;
  systemHealth: 'HEALTHY' | 'DEGRADED';
  recentAuditLogs: {
    id: string;
    action: string;
    target: string;
    timestamp: string;
    status: 'INFO' | 'WARNING' | 'ALERT';
  }[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  isMockData?: boolean;
}

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
}
