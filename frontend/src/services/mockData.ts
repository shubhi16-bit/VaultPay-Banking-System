/**
 * Mock Data Layer for VaultPay
 * 
 * IMPORTANT NOTICE:
 * This data is used ONLY when the backend API is unavailable or pending integration.
 * Every piece of mock data carries `isMockData: true` to prevent confusing mock data with verified backend responses.
 */

import type { User, BankAccount, Transaction, SpendingInsight, SystemStats } from '../types';

export const IS_MOCK_FALLBACK_ACTIVE = true;

export const INITIAL_MOCK_USER: User = {
  id: 'usr_mock_001',
  name: 'Alex Sharma',
  email: 'alex.sharma@example.com',
  vaultPayId: 'alex@vault',
  phone: '+91 98765 43210',
  role: 'user',
  isBankLinked: true,
  avatarUrl: '',
  createdAt: '2026-01-15T10:00:00Z',
};

export const UNLINKED_MOCK_USER: User = {
  id: 'usr_mock_002',
  name: 'Samir Khan',
  email: 'samir.khan@example.com',
  vaultPayId: 'samir@vault',
  phone: '+91 91234 56789',
  role: 'user',
  isBankLinked: false, // For testing first-time onboarding
  createdAt: '2026-10-21T09:00:00Z',
};

export const INITIAL_MOCK_ADMIN: User = {
  id: 'usr_admin_001',
  name: 'Security Admin',
  email: 'admin@vaultpay.internal',
  vaultPayId: 'admin@vault',
  phone: '+91 99999 88888',
  role: 'admin',
  isBankLinked: true,
  createdAt: '2025-11-01T08:00:00Z',
};

// Rich simulated partner banks for realistic onboarding
export interface SimulatedPartnerBank {
  id: string;
  name: string;
  code: string;
  tagline: string;
  ifscPrefix: string;
  badgeColor: string;
  textColor: string;
  popular: boolean;
}

export const SIMULATED_PARTNER_BANKS: SimulatedPartnerBank[] = [
  {
    id: 'bank_apex',
    name: 'Vault Apex Bank',
    code: 'VABK',
    tagline: 'Flagship Digital Partner',
    ifscPrefix: 'VABK0001001',
    badgeColor: 'bg-indigo-600',
    textColor: 'text-indigo-600',
    popular: true,
  },
  {
    id: 'bank_zenith',
    name: 'Zenith Trust Bank',
    code: 'ZNBK',
    tagline: 'National Commercial Branch',
    ifscPrefix: 'ZNBK0002045',
    badgeColor: 'bg-blue-600',
    textColor: 'text-blue-600',
    popular: true,
  },
  {
    id: 'bank_meridian',
    name: 'Meridian Capital Bank',
    code: 'MCBK',
    tagline: 'Premier Retail Banking',
    ifscPrefix: 'MCBK0003189',
    badgeColor: 'bg-emerald-600',
    textColor: 'text-emerald-600',
    popular: true,
  },
  {
    id: 'bank_nova',
    name: 'Nova Federal Bank',
    code: 'NOVA',
    tagline: 'Instant UPI Clearing',
    ifscPrefix: 'NOVA0004921',
    badgeColor: 'bg-sky-600',
    textColor: 'text-sky-600',
    popular: true,
  },
  {
    id: 'bank_horizon',
    name: 'Horizon Union Bank',
    code: 'HZBK',
    tagline: 'Community & SME Banking',
    ifscPrefix: 'HZBK0005734',
    badgeColor: 'bg-amber-600',
    textColor: 'text-amber-600',
    popular: false,
  },
  {
    id: 'bank_atlas',
    name: 'Atlas Reserve Bank',
    code: 'ATLS',
    tagline: 'Global Clearinghouse',
    ifscPrefix: 'ATLS0006208',
    badgeColor: 'bg-slate-800',
    textColor: 'text-slate-800',
    popular: false,
  },
];

export const INITIAL_MOCK_BANKS: BankAccount[] = [
  {
    id: 'bank_001',
    userId: 'usr_mock_001',
    bankName: 'Vault Apex Bank',
    bankCode: 'VABK',
    accountNumber: '501004829104',
    maskedAccountNumber: '•••• 9104',
    ifscCode: 'VABK0001001',
    accountType: 'Savings',
    isPrimary: true,
    balance: 42500.50,
    linkedAt: '2026-01-16T11:20:00Z',
  },
  {
    id: 'bank_002',
    userId: 'usr_mock_001',
    bankName: 'Zenith Trust Bank',
    bankCode: 'ZNBK',
    accountNumber: '204918239012',
    maskedAccountNumber: '•••• 9012',
    ifscCode: 'ZNBK0002045',
    accountType: 'Current',
    isPrimary: false,
    balance: 18200.00,
    linkedAt: '2026-02-01T14:45:00Z',
  },
];

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

export const INITIAL_MOCK_CONTACTS: FrequentContact[] = [
  {
    id: 'ct_01',
    name: 'Priya Verma',
    vaultPayId: 'priya@vault',
    phone: '+91 98201 11223',
    avatarBg: 'bg-rose-100',
    avatarColor: 'text-rose-700',
    initials: 'PV',
  },
  {
    id: 'ct_02',
    name: 'Rohan Mehta',
    vaultPayId: 'rohan@vp',
    phone: '+91 98334 22334',
    avatarBg: 'bg-indigo-100',
    avatarColor: 'text-indigo-700',
    initials: 'RM',
  },
  {
    id: 'ct_03',
    name: 'Metro Groceries',
    vaultPayId: 'groceries@vault',
    phone: '+91 98700 33445',
    avatarBg: 'bg-emerald-100',
    avatarColor: 'text-emerald-700',
    initials: 'MG',
    isMerchant: true,
  },
  {
    id: 'ct_04',
    name: 'Urban Tech Store',
    vaultPayId: 'urbantech@vp',
    phone: '+91 99112 44556',
    avatarBg: 'bg-amber-100',
    avatarColor: 'text-amber-700',
    initials: 'UT',
    isMerchant: true,
  },
  {
    id: 'ct_05',
    name: 'Aanya Patel',
    vaultPayId: 'aanya@vault',
    phone: '+91 98450 55667',
    avatarBg: 'bg-purple-100',
    avatarColor: 'text-purple-700',
    initials: 'AP',
  },
  {
    id: 'ct_06',
    name: 'Kabir Sen',
    vaultPayId: 'kabir@vp',
    phone: '+91 98670 66778',
    avatarBg: 'bg-sky-100',
    avatarColor: 'text-sky-700',
    initials: 'KS',
  },
];

export const INITIAL_MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx_001',
    referenceId: 'VPY8291039401',
    type: 'SEND',
    amount: 1450.00,
    currency: 'INR',
    senderName: 'Alex Sharma',
    senderVaultPayId: 'alex@vault',
    recipientName: 'Priya Verma',
    recipientVaultPayId: 'priya@vault',
    timestamp: '2026-10-21T14:20:00Z',
    status: 'SUCCESS',
    note: 'Dinner bill split',
    category: 'Dining',
    bankAccountMasked: '•••• 9104',
    isMockData: true,
  },
  {
    id: 'tx_002',
    referenceId: 'VPY5910284712',
    type: 'RECEIVE',
    amount: 3200.00,
    currency: 'INR',
    senderName: 'Rohan Mehta',
    senderVaultPayId: 'rohan@vp',
    recipientName: 'Alex Sharma',
    recipientVaultPayId: 'alex@vault',
    timestamp: '2026-10-20T18:05:00Z',
    status: 'SUCCESS',
    note: 'Weekend travel contribution',
    category: 'Travel',
    bankAccountMasked: '•••• 9104',
    isMockData: true,
  },
  {
    id: 'tx_003',
    referenceId: 'VPY2019482910',
    type: 'ADD_MONEY',
    amount: 5000.00,
    currency: 'INR',
    senderName: 'Vault Apex Bank (•••• 9104)',
    senderVaultPayId: 'bank@vabk',
    recipientName: 'Alex Sharma (Wallet)',
    recipientVaultPayId: 'alex@vault',
    timestamp: '2026-10-19T09:30:00Z',
    status: 'SUCCESS',
    note: 'Simulated top-up from linked bank account',
    category: 'Transfer',
    bankAccountMasked: '•••• 9104',
    isMockData: true,
  },
  {
    id: 'tx_004',
    referenceId: 'VPY1092847123',
    type: 'SEND',
    amount: 850.00,
    currency: 'INR',
    senderName: 'Alex Sharma',
    senderVaultPayId: 'alex@vault',
    recipientName: 'Metro Groceries',
    recipientVaultPayId: 'groceries@vault',
    timestamp: '2026-10-18T16:42:00Z',
    status: 'SUCCESS',
    note: 'Weekly essentials and snacks',
    category: 'Groceries',
    bankAccountMasked: '•••• 9104',
    isMockData: true,
  },
  {
    id: 'tx_005',
    referenceId: 'VPY9018274619',
    type: 'SEND',
    amount: 4500.00,
    currency: 'INR',
    senderName: 'Alex Sharma',
    senderVaultPayId: 'alex@vault',
    recipientName: 'Urban Tech Store',
    recipientVaultPayId: 'urbantech@vp',
    timestamp: '2026-10-15T12:11:00Z',
    status: 'SUCCESS',
    note: 'Noise-cancelling headphones',
    category: 'Shopping',
    bankAccountMasked: '•••• 9012',
    isMockData: true,
  },
];

export const MOCK_SPENDING_INSIGHTS: SpendingInsight = {
  totalSpentThisMonth: 6800.00,
  totalReceivedThisMonth: 3200.00,
  transactionCount: 5,
  categories: [
    { category: 'Shopping', amount: 4500.00, percentage: 66, color: '#4F46E5', count: 1 },
    { category: 'Dining', amount: 1450.00, percentage: 21, color: '#06B6D4', count: 1 },
    { category: 'Groceries', amount: 850.00, percentage: 13, color: '#10B981', count: 1 },
  ],
  monthlyTrend: [
    { month: 'Jun', spent: 5400, received: 6000 },
    { month: 'Jul', spent: 7200, received: 4500 },
    { month: 'Aug', spent: 4800, received: 8000 },
    { month: 'Sep', spent: 6100, received: 5000 },
    { month: 'Oct', spent: 6800, received: 3200 },
  ],
};

export const MOCK_SYSTEM_STATS: SystemStats = {
  totalUsers: 1420,
  totalTransactionsCount: 18450,
  totalVolume: 4289050.00,
  activeUsersToday: 312,
  systemHealth: 'HEALTHY',
  recentAuditLogs: [
    { id: 'log_01', action: 'USER_LOGIN', target: 'alex@vault', timestamp: '2026-10-21T14:19:00Z', status: 'INFO' },
    { id: 'log_02', action: 'PAYMENT_EXECUTED', target: 'priya@vault (₹1,450.00)', timestamp: '2026-10-21T14:20:00Z', status: 'INFO' },
    { id: 'log_03', action: 'BANK_ACCOUNT_LINKED', target: 'Vault Apex Bank (•••• 9104)', timestamp: '2026-10-21T11:00:00Z', status: 'INFO' },
    { id: 'log_04', action: 'SUSPICIOUS_PIN_ATTEMPT', target: 'test@vault', timestamp: '2026-10-20T22:15:00Z', status: 'WARNING' },
  ],
};
