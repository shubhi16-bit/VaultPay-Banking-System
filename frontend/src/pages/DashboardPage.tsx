import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBank } from '../context/BankContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Input';
import { Alert } from '../components/common/Alert';
import { PendingIntegrationModal } from '../components/common/PendingIntegrationModal';
import { formatCurrency, formatDate } from '../utils/formatters';
import type { Transaction, FrequentContact } from '../types';
import {
  Send,
  QrCode,
  PlusCircle,
  Landmark,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  Check,
  ShieldCheck,
  Receipt,
  Download,
  Eye,
  EyeOff,
  Lock,
  Building2,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const {
    primaryAccount,
    walletBalance,
    transactions,
    contacts,
    bankAccounts,
    sendPayment,
    simulateOfflineSandboxPayment,
  } = useBank();

  const [copied, setCopied] = useState(false);
  const [hideBalance, setHideBalance] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Quick Pay Modal State (Google Pay tap-to-pay contact)
  const [quickPayContact, setQuickPayContact] = useState<FrequentContact | null>(null);
  const [quickPayAmount, setQuickPayAmount] = useState('');
  const [quickPayNote, setQuickPayNote] = useState('');
  const [quickPayPin, setQuickPayPin] = useState('1234');
  const [quickPayError, setQuickPayError] = useState<string | null>(null);
  const [isProcessingQuickPay, setIsProcessingQuickPay] = useState(false);
  const [quickPayReceipt, setQuickPayReceipt] = useState<Transaction | null>(null);
  const [pendingModalData, setPendingModalData] = useState<{
    isOpen: boolean;
    payload?: any;
    endpoint: string;
  }>({
    isOpen: false,
    endpoint: '/api/payments',
  });

  // Filter for recent transactions
  const [txFilter, setTxFilter] = useState<'ALL' | 'SEND' | 'RECEIVE' | 'ADD_MONEY'>('ALL');

  const navigate = useNavigate();

  const handleCopyId = () => {
    if (user?.vaultPayId) {
      navigator.clipboard.writeText(user.vaultPayId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    if (txFilter === 'ALL') return true;
    return t.type === txFilter;
  }).slice(0, 5);

  // Quick pay handler
  const handleExecuteQuickPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPayContact) return;
    setQuickPayError(null);

    const amt = parseFloat(quickPayAmount);
    if (isNaN(amt) || amt <= 0) {
      setQuickPayError('Enter a valid payment amount greater than ₹0.');
      return;
    }

    if (!primaryAccount) {
      setQuickPayError('No linked bank account found. Link a bank first.');
      return;
    }

    if (primaryAccount.balance < amt) {
      setQuickPayError(`Insufficient balance in ${primaryAccount.bankName}. Available: ${formatCurrency(primaryAccount.balance)}`);
      return;
    }

    if (!quickPayPin || quickPayPin.length < 4) {
      setQuickPayError('Enter your 4 or 6-digit security PIN.');
      return;
    }

    setIsProcessingQuickPay(true);
    try {
      const res = await sendPayment({
        recipientVaultPayId: quickPayContact.vaultPayId,
        amount: amt,
        note: quickPayNote || `Payment to ${quickPayContact.name}`,
        sourceBankAccountId: primaryAccount.id,
        pin: quickPayPin,
      });

      if (res.success && res.transaction) {
        setQuickPayReceipt(res.transaction);
        setQuickPayContact(null);
        setQuickPayAmount('');
        setQuickPayNote('');
      } else if (res.isPendingIntegration) {
        setQuickPayContact(null);
        setPendingModalData({
          isOpen: true,
          endpoint: '/api/payments',
          payload: {
            recipientVaultPayId: quickPayContact.vaultPayId,
            amount: amt,
            note: quickPayNote,
            sourceBankAccountId: primaryAccount.id,
            pin: '••••',
          },
        });
      } else {
        setQuickPayError(res.error || 'Payment failed.');
      }
    } catch {
      setQuickPayError('A network error occurred while processing the transfer.');
    } finally {
      setIsProcessingQuickPay(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Balance & Profile Card (Google Pay aesthetic with Navy/Indigo gradients) */}
      <Card variant="navy" padding="lg" className="relative overflow-hidden shadow-elevated">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-72 h-72 rounded-full bg-indigo-500/25 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 -mb-20 w-60 h-60 rounded-full bg-blue-400/15 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                Personal Digital Account
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck size={11} />
                Verified
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Hello, {user?.name || 'VaultPay User'}
            </h1>

            <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-300 font-mono">
              <span>{user?.vaultPayId || 'user@vault'}</span>
              <button
                type="button"
                onClick={handleCopyId}
                aria-label="Copy VaultPay ID"
                className="p-1 hover:text-white rounded transition-colors text-slate-400"
                title="Copy VaultPay ID"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* Balance Pill Card with Eye toggle */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-white/15 min-w-[280px]">
            <div className="flex items-center justify-between text-xs font-medium text-slate-300">
              <span>Simulated Wallet Balance</span>
              <button
                type="button"
                onClick={() => setHideBalance(!hideBalance)}
                aria-label={hideBalance ? 'Show balance' : 'Hide balance'}
                className="text-slate-300 hover:text-white p-0.5"
                title={hideBalance ? 'Show balance' : 'Hide balance'}
              >
                {hideBalance ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            <p className="text-2xl sm:text-3xl font-bold text-white mt-1 font-mono tracking-tight">
              {hideBalance ? '••••••••' : formatCurrency(walletBalance)}
            </p>

            <div className="mt-3 pt-3 border-t border-white/15 flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-1.5 truncate">
                <Landmark size={14} className="text-indigo-300 shrink-0" />
                <span className="truncate">{primaryAccount ? primaryAccount.bankName : 'No Bank Linked'}</span>
              </span>
              <span className="font-mono font-medium ml-2">
                {primaryAccount ? primaryAccount.maskedAccountNumber : '—'}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Primary Circular Quick Action Buttons (Google Pay style) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <button
          type="button"
          onClick={() => navigate('/pay')}
          className="flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all active:scale-[0.98] group"
        >
          <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2.5 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <Send size={22} className="stroke-[2.2]" />
          </div>
          <span className="text-xs sm:text-sm font-bold text-slate-900">Pay People</span>
          <span className="text-[11px] text-slate-500 mt-0.5">Via VaultPay ID</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/qr')}
          className="flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all active:scale-[0.98] group"
        >
          <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2.5 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
            <QrCode size={22} className="stroke-[2.2]" />
          </div>
          <span className="text-xs sm:text-sm font-bold text-slate-900">Scan & QR</span>
          <span className="text-[11px] text-slate-500 mt-0.5">Camera or Code</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/add-money')}
          className="flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all active:scale-[0.98] group"
        >
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2.5 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
            <PlusCircle size={22} className="stroke-[2.2]" />
          </div>
          <span className="text-xs sm:text-sm font-bold text-slate-900">Add Money</span>
          <span className="text-[11px] text-slate-500 mt-0.5">From Bank Account</span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/accounts')}
          className="flex flex-col items-center justify-center p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm hover:border-indigo-300 hover:shadow-md transition-all active:scale-[0.98] group"
        >
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center mb-2.5 group-hover:bg-slate-900 group-hover:text-white transition-colors">
            <Landmark size={22} className="stroke-[2.2]" />
          </div>
          <span className="text-xs sm:text-sm font-bold text-slate-900">Bank Accounts</span>
          <span className="text-[11px] text-slate-500 mt-0.5">
            {bankAccounts.length} Linked
          </span>
        </button>
      </div>

      {/* People & Businesses (Frequent Payees - Google Pay Circular Carousel) */}
      <Card padding="md" className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-bold text-slate-900">
              People & Businesses
            </h2>
            <span className="text-[11px] text-slate-400 font-medium">Tap to quick pay</span>
          </div>
          <Link to="/pay" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">
            Pay New
          </Link>
        </div>

        <div className="flex items-center gap-4 overflow-x-auto pb-1 pt-1 no-scrollbar">
          {contacts.map((contact) => (
            <button
              key={contact.id}
              type="button"
              onClick={() => setQuickPayContact(contact)}
              className="flex flex-col items-center min-w-[70px] group transition-transform active:scale-95"
            >
              <div
                className={`w-14 h-14 rounded-full ${contact.avatarBg} ${contact.avatarColor} font-bold text-base flex items-center justify-center mb-1.5 shadow-sm ring-2 ring-transparent group-hover:ring-indigo-400 group-hover:shadow transition-all`}
              >
                {contact.initials}
              </div>
              <span className="text-xs font-bold text-slate-800 truncate max-w-[76px] text-center">
                {contact.name.split(' ')[0]}
              </span>
              <span className="text-[10px] text-slate-400 font-mono truncate max-w-[76px] text-center">
                {contact.vaultPayId.split('@')[0]}
              </span>
            </button>
          ))}
        </div>
      </Card>

      {/* Main Grid: Recent Transactions & Monthly Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions List (2 Cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Recent Transactions
            </h2>

            {/* Filter chips */}
            <div className="flex items-center gap-1 text-xs">
              {(['ALL', 'SEND', 'RECEIVE'] as const).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setTxFilter(filter)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-colors ${
                    txFilter === filter
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {filter === 'ALL' ? 'All' : filter === 'SEND' ? 'Paid' : 'Received'}
                </button>
              ))}
              <Link
                to="/transactions"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 ml-2"
              >
                View All
              </Link>
            </div>
          </div>

          <Card padding="none" className="divide-y divide-slate-100 overflow-hidden shadow-sm">
            {filteredTransactions.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No recent transactions in this category.
              </div>
            ) : (
              filteredTransactions.map((tx) => {
                const isDebit = tx.type === 'SEND';
                const isTopUp = tx.type === 'ADD_MONEY';

                return (
                  <div
                    key={tx.id}
                    onClick={() => setSelectedTx(tx)}
                    className="p-4 sm:p-4.5 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                          isDebit
                            ? 'bg-rose-50 text-rose-600'
                            : isTopUp
                            ? 'bg-indigo-50 text-indigo-600'
                            : 'bg-emerald-50 text-emerald-600'
                        }`}
                      >
                        {isDebit ? (
                          <ArrowUpRight size={19} />
                        ) : isTopUp ? (
                          <PlusCircle size={19} />
                        ) : (
                          <ArrowDownLeft size={19} />
                        )}
                      </div>

                      <div className="space-y-0.5 text-left">
                        <p className="text-xs sm:text-sm font-semibold text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                          {isDebit
                            ? `Paid to ${tx.recipientName}`
                            : isTopUp
                            ? 'Wallet Top-up'
                            : `Received from ${tx.senderName}`}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {formatDate(tx.timestamp)} • <span className="font-mono">{tx.bankAccountMasked}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right space-y-1">
                      <p
                        className={`text-xs sm:text-sm font-bold font-mono ${
                          isDebit ? 'text-slate-900' : 'text-emerald-600'
                        }`}
                      >
                        {isDebit ? `- ${formatCurrency(tx.amount)}` : `+ ${formatCurrency(tx.amount)}`}
                      </p>
                      <div className="flex items-center justify-end gap-1.5">
                        <Badge
                          size="sm"
                          variant={tx.status === 'SUCCESS' ? 'success' : tx.status === 'PENDING' ? 'warning' : 'danger'}
                        >
                          {tx.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </Card>
        </div>

        {/* Quick Insights Sidebar Box (1 Col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Monthly Overview
            </h2>
            <Link
              to="/insights"
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Details
            </Link>
          </div>

          <Card padding="md" className="space-y-4">
            <div className="space-y-1">
              <span className="text-xs text-slate-500">Total Spent this Month</span>
              <p className="text-2xl font-extrabold text-slate-900 font-mono">
                {formatCurrency(6800.00)}
              </p>
            </div>

            {/* Simulated mini progress bars for top categories */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                  <span>Shopping</span>
                  <span className="font-mono">₹4,500 (66%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full" style={{ width: '66%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                  <span>Dining & Food</span>
                  <span className="font-mono">₹1,450 (21%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-sky-500 h-full rounded-full" style={{ width: '21%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                  <span>Groceries</span>
                  <span className="font-mono">₹850 (13%)</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: '13%' }} />
                </div>
              </div>
            </div>

            <Link to="/insights" className="block pt-2">
              <Button variant="secondary" fullWidth size="sm">
                View Full Spending Insights
              </Button>
            </Link>
          </Card>

          {/* Quick Security Tip */}
          <div className="p-4 rounded-2xl bg-slate-100/70 border border-slate-200/80 text-xs text-slate-600 space-y-1.5">
            <p className="font-semibold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-indigo-600" />
              Safety Guarantee
            </p>
            <p className="leading-relaxed">
              Never share your simulated UPI PIN with anyone. VaultPay officials will never call requesting your PIN or OTP.
            </p>
          </div>
        </div>
      </div>

      {/* QUICK PAY MODAL (Google Pay Style Tap-to-Pay) */}
      {quickPayContact && (
        <Modal
          isOpen={Boolean(quickPayContact)}
          onClose={() => setQuickPayContact(null)}
          title="Send Payment"
        >
          <div className="space-y-4">
            <div className="text-center space-y-2 pb-2">
              <div className={`w-16 h-16 rounded-full ${quickPayContact.avatarBg} ${quickPayContact.avatarColor} font-bold text-xl flex items-center justify-center mx-auto shadow-sm`}>
                {quickPayContact.initials}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{quickPayContact.name}</h3>
                <p className="text-xs font-mono text-slate-500">{quickPayContact.vaultPayId}</p>
              </div>
            </div>

            {quickPayError && (
              <Alert variant="danger">{quickPayError}</Alert>
            )}

            <form onSubmit={handleExecuteQuickPay} className="space-y-3.5">
              <div className="space-y-1 text-left">
                <label htmlFor="qpAmount" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Amount (INR)
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-xl font-bold text-slate-400">₹</span>
                  <input
                    id="qpAmount"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={quickPayAmount}
                    onChange={(e) => setQuickPayAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                    required
                    autoFocus
                    className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3.5 py-2.5 text-2xl font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <Input
                id="qpNote"
                label="Note (Optional)"
                placeholder="What is this for?"
                value={quickPayNote}
                onChange={(e) => setQuickPayNote(e.target.value)}
                maxLength={50}
              />

              {primaryAccount && (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Building2 size={14} className="text-indigo-600" />
                    <span>Pay with {primaryAccount.bankName}</span>
                  </span>
                  <span className="font-mono font-bold text-slate-800">
                    Bal: {formatCurrency(primaryAccount.balance)}
                  </span>
                </div>
              )}

              <Input
                id="qpPin"
                type="password"
                inputMode="numeric"
                maxLength={6}
                label="Simulated UPI PIN"
                placeholder="••••"
                value={quickPayPin}
                onChange={(e) => setQuickPayPin(e.target.value)}
                required
                helperText="Sandbox default: 1234"
              />

              <div className="flex gap-3 pt-2">
                <Button variant="outline" fullWidth onClick={() => setQuickPayContact(null)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  isLoading={isProcessingQuickPay}
                  leftIcon={<Lock size={16} />}
                >
                  Pay {quickPayAmount ? formatCurrency(parseFloat(quickPayAmount) || 0) : ''}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Quick Pay Receipt Modal */}
      {quickPayReceipt && (
        <Modal
          isOpen={Boolean(quickPayReceipt)}
          onClose={() => setQuickPayReceipt(null)}
          title="Payment Successful"
        >
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <Check size={36} className="stroke-[2.5]" />
            </div>

            <div>
              <p className="text-xs uppercase font-bold text-slate-400">Paid to</p>
              <h3 className="text-xl font-bold text-slate-900">{quickPayReceipt.recipientName}</h3>
              <p className="text-xs font-mono text-slate-500">{quickPayReceipt.recipientVaultPayId}</p>
            </div>

            <p className="text-3xl font-extrabold text-slate-900 font-mono">
              {formatCurrency(quickPayReceipt.amount)}
            </p>

            <div className="flex justify-center">
              <Badge variant="success">Completed</Badge>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction ID:</span>
                <span className="font-mono font-medium">{quickPayReceipt.referenceId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Funding Source:</span>
                <span>Bank Account ({quickPayReceipt.bankAccountMasked})</span>
              </div>
              {quickPayReceipt.note && (
                <div className="flex justify-between border-t border-slate-200 pt-2">
                  <span className="text-slate-500">Note:</span>
                  <span className="italic font-medium">{quickPayReceipt.note}</span>
                </div>
              )}
            </div>

            <Button variant="primary" fullWidth size="lg" onClick={() => setQuickPayReceipt(null)}>
              Done
            </Button>
          </div>
        </Modal>
      )}

      {/* Transaction Details Modal */}
      {selectedTx && (
        <Modal
          isOpen={Boolean(selectedTx)}
          onClose={() => setSelectedTx(null)}
          title="Payment Receipt"
        >
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <Receipt size={28} />
            </div>

            <div>
              <p className="text-xs uppercase font-bold tracking-wider text-slate-400">
                {selectedTx.type === 'SEND' ? 'Payment to' : selectedTx.type === 'ADD_MONEY' ? 'Money Added' : 'Payment from'}
              </p>
              <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                {selectedTx.type === 'SEND' ? selectedTx.recipientName : selectedTx.senderName}
              </h3>
              <p className="text-xs font-mono text-slate-500">
                {selectedTx.type === 'SEND' ? selectedTx.recipientVaultPayId : selectedTx.senderVaultPayId}
              </p>
            </div>

            <div className="py-1">
              <p className="text-3xl font-extrabold text-slate-900 font-mono">
                {formatCurrency(selectedTx.amount)}
              </p>
              <div className="mt-1 flex items-center justify-center gap-1.5">
                <Badge variant={selectedTx.status === 'SUCCESS' ? 'success' : 'danger'}>
                  {selectedTx.status}
                </Badge>
                {selectedTx.isMockData && (
                  <Badge variant="warning">Simulated Sandbox</Badge>
                )}
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Reference ID:</span>
                <span className="font-mono font-medium text-slate-900">{selectedTx.referenceId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date & Time:</span>
                <span className="text-slate-900">{formatDate(selectedTx.timestamp)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Method:</span>
                <span className="text-slate-900">Bank Account ({selectedTx.bankAccountMasked})</span>
              </div>
              {selectedTx.note && (
                <div className="flex justify-between border-t border-slate-200/80 pt-2">
                  <span className="text-slate-500">Note:</span>
                  <span className="text-slate-900 italic font-medium">{selectedTx.note}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2.5 pt-2">
              <Button
                variant="outline"
                fullWidth
                size="sm"
                leftIcon={<Download size={15} />}
                onClick={() => alert(`Simulated receipt download for Ref: ${selectedTx.referenceId}`)}
              >
                Download Receipt
              </Button>
              <Button
                variant="primary"
                fullWidth
                size="sm"
                onClick={() => setSelectedTx(null)}
              >
                Done
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Honest Backend Integration Pending Modal */}
      <PendingIntegrationModal
        isOpen={pendingModalData.isOpen}
        onClose={() => setPendingModalData({ ...pendingModalData, isOpen: false })}
        operationName="Quick Transfer"
        endpoint={pendingModalData.endpoint}
        payload={pendingModalData.payload}
        onRetry={(e?: unknown) => handleExecuteQuickPay(e as unknown as React.FormEvent)}
        onSimulateSandbox={() => {
          if (!pendingModalData.payload) return;
          const res = simulateOfflineSandboxPayment({
            recipientVaultPayId: pendingModalData.payload.recipientVaultPayId,
            amount: pendingModalData.payload.amount,
            note: pendingModalData.payload.note,
            sourceBankAccountId: pendingModalData.payload.sourceBankAccountId,
            pin: '1234',
          });
          setPendingModalData({ ...pendingModalData, isOpen: false });
          if (res.success && res.transaction) {
            setQuickPayReceipt(res.transaction);
          }
        }}
        isRetrying={isProcessingQuickPay}
      />
    </div>
  );
};
