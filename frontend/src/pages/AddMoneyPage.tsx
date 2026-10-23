import React, { useState } from 'react';
import { useBank } from '../context/BankContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Alert } from '../components/common/Alert';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { PendingIntegrationModal } from '../components/common/PendingIntegrationModal';
import { formatCurrency } from '../utils/formatters';
import type { Transaction, AddMoneyPayload } from '../types';
import {
  PlusCircle,
  Landmark,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

export const AddMoneyPage: React.FC = () => {
  const {
    bankAccounts,
    primaryAccount,
    walletBalance,
    addMoney,
    simulateOfflineSandboxDeposit,
  } = useBank();

  const [amount, setAmount] = useState('1000');
  const [selectedBankId, setSelectedBankId] = useState(
    primaryAccount?.id || (bankAccounts[0]?.id || '')
  );
  const [pin, setPin] = useState('1234');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [receiptTx, setReceiptTx] = useState<Transaction | null>(null);

  // Pending integration modal state
  const [pendingModalData, setPendingModalData] = useState<{
    isOpen: boolean;
    payload?: AddMoneyPayload;
    endpoint: string;
  }>({
    isOpen: false,
    endpoint: '/api/wallet/deposit',
  });

  const selectedBank =
    bankAccounts.find((b) => b.id === selectedBankId) || primaryAccount;

  const parsedAmount = parseFloat(amount) || 0;
  const isOverBankBalance = selectedBank ? parsedAmount > selectedBank.balance : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return; // Prevent duplicate clicks
    setError(null);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please enter a valid deposit amount greater than ₹0.');
      return;
    }

    if (parsedAmount > 100000) {
      setError('For simulation stability, maximum single demo deposit is ₹1,00,000.00.');
      return;
    }

    if (!selectedBank) {
      setError('Please select or link a bank account.');
      return;
    }

    if (selectedBank.balance < parsedAmount) {
      setError(
        `Insufficient funds in ${selectedBank.bankName}. Available balance: ${formatCurrency(
          selectedBank.balance
        )}.`
      );
      return;
    }

    if (!pin || pin.length < 4) {
      setError('Please enter your 4 or 6-digit security PIN to authorize this deposit.');
      return;
    }

    setIsLoading(true);

    const payload: AddMoneyPayload = {
      amount: parsedAmount,
      bankAccountId: selectedBank.id,
      pin,
    };

    try {
      const res = await addMoney(payload);

      if (res.success && res.transaction) {
        // Backend confirmed deposit
        setReceiptTx(res.transaction);
        setAmount('');
      } else if (res.isPendingIntegration) {
        // Honest integration-pending modal (backend is offline)
        setPendingModalData({
          isOpen: true,
          payload,
          endpoint: '/api/wallet/deposit',
        });
      } else {
        setError(res.error || 'Failed to complete deposit.');
      }
    } catch {
      setError('An error occurred while connecting to the deposit service.');
    } finally {
      setIsLoading(false);
    }
  };

  // Local sandbox simulation for offline preview
  const handleSimulateSandbox = () => {
    if (!pendingModalData.payload) return;
    const res = simulateOfflineSandboxDeposit(pendingModalData.payload);
    setPendingModalData({ ...pendingModalData, isOpen: false });
    if (res.success && res.transaction) {
      setReceiptTx(res.transaction);
      setAmount('');
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <PlusCircle size={24} className="text-emerald-600" />
          <span>Add Demo Money</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Simulate depositing funds into your VaultPay wallet from a linked bank account
        </p>
      </div>

      {/* Prominent Demo Sandbox Notice */}
      <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200/80 flex items-start gap-3 text-left">
        <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed space-y-1">
          <p className="font-bold">Simulated Sandbox Environment</p>
          <p>
            VaultPay is a simulated college banking application. All deposits are strictly demo credits used to test transfers and QR payments. No actual bank transfers or real money are involved.
          </p>
        </div>
      </div>

      {/* Wallet Balance Highlight */}
      <Card variant="accent" padding="md" className="flex items-center justify-between">
        <div className="space-y-0.5 text-left">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
            Current Wallet Balance
          </p>
          <p className="text-3xl font-extrabold text-slate-900 font-mono">
            {formatCurrency(walletBalance)}
          </p>
        </div>
        <div className="w-11 h-11 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-sm">
          <PlusCircle size={24} />
        </div>
      </Card>

      {/* Deposit Form Card */}
      <Card padding="lg" className="shadow-elevated space-y-5">
        {error && (
          <Alert variant="danger" title="Deposit Authorization Error">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Amount input */}
          <div className="space-y-1.5 text-left">
            <div className="flex items-center justify-between">
              <label
                htmlFor="topupAmount"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Amount to Deposit (INR)
              </label>
              {selectedBank && (
                <span
                  className={`text-[11px] font-medium ${
                    isOverBankBalance ? 'text-rose-600 font-bold' : 'text-slate-500'
                  }`}
                >
                  Bank Bal: {formatCurrency(selectedBank.balance)}
                </span>
              )}
            </div>

            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-xl font-bold text-slate-400">₹</span>
              <input
                id="topupAmount"
                name="amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value.replace(/[^0-9.]/g, ''));
                  setError(null);
                }}
                required
                className={`w-full rounded-xl border bg-white pl-8 pr-3.5 py-3 text-2xl font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 placeholder:text-slate-300 transition-colors ${
                  isOverBankBalance
                    ? 'border-rose-400 focus:ring-rose-500'
                    : 'border-slate-200 focus:ring-indigo-600'
                }`}
              />
            </div>

            {/* Quick preset chips */}
            <div className="flex gap-2 pt-1">
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setAmount(amt.toString())}
                  className={`flex-1 py-1 text-xs font-semibold rounded-lg border transition-all ${
                    amount === amt.toString()
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  +₹{amt}
                </button>
              ))}
            </div>

            {isOverBankBalance && (
              <p className="text-xs text-rose-600 flex items-center gap-1 font-medium mt-1">
                <AlertTriangle size={13} />
                <span>
                  Amount exceeds available balance in {selectedBank?.bankName}.
                </span>
              </p>
            )}
          </div>

          {/* Debit Bank Account Selector */}
          <div className="space-y-1.5 text-left">
            <label
              htmlFor="bankSelect"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
            >
              Debit From Linked Bank
            </label>
            <select
              id="bankSelect"
              value={selectedBankId}
              onChange={(e) => setSelectedBankId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              {bankAccounts.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.bankName} ({b.maskedAccountNumber}) — Bal: {formatCurrency(b.balance)}
                </option>
              ))}
            </select>
            {selectedBank && (
              <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                <Landmark size={13} className="text-slate-400" />
                <span>
                  Source Bank Available:{' '}
                  <strong>{formatCurrency(selectedBank.balance)}</strong>
                </span>
              </p>
            )}
          </div>

          {/* PIN input */}
          <div className="space-y-1.5 text-left">
            <div className="flex justify-between items-center">
              <label
                htmlFor="depositPin"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Simulated UPI PIN
              </label>
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="text-[11px] text-indigo-600 flex items-center gap-1 font-medium"
              >
                {showPin ? <EyeOff size={13} /> : <Eye size={13} />}
                <span>{showPin ? 'Hide' : 'Show'}</span>
              </button>
            </div>
            <Input
              id="depositPin"
              name="pin"
              type={showPin ? 'text' : 'password'}
              inputMode="numeric"
              maxLength={6}
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
              required
              helperText="Default sandbox PIN: 1234"
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isLoading}
            disabled={isLoading || isOverBankBalance || parsedAmount <= 0 || !pin}
            leftIcon={<ShieldCheck size={18} />}
            rightIcon={<ArrowRight size={18} />}
          >
            Authorize &amp; Deposit {parsedAmount > 0 ? formatCurrency(parsedAmount) : ''}
          </Button>
        </form>
      </Card>

      {/* Honest Backend Integration Pending Modal */}
      <PendingIntegrationModal
        isOpen={pendingModalData.isOpen}
        onClose={() => setPendingModalData({ ...pendingModalData, isOpen: false })}
        operationName="Demo Money Deposit"
        endpoint={pendingModalData.endpoint}
        payload={pendingModalData.payload as unknown as Record<string, unknown>}
        onRetry={(e?: unknown) => handleSubmit(e as unknown as React.FormEvent)}
        onSimulateSandbox={handleSimulateSandbox}
        isRetrying={isLoading}
      />

      {/* Confirmed Deposit Receipt Modal */}
      {receiptTx && (
        <Modal
          isOpen={Boolean(receiptTx)}
          onClose={() => setReceiptTx(null)}
          title="Deposit Successful"
        >
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 size={36} />
            </div>

            <div>
              <p className="text-xs uppercase font-bold text-slate-400">
                Credited to
              </p>
              <h3 className="text-xl font-bold text-slate-900">VaultPay Wallet</h3>
              <p className="text-xs font-mono text-slate-500">
                New Wallet Balance: {formatCurrency(walletBalance)}
              </p>
            </div>

            <p className="text-3xl font-extrabold text-slate-900 font-mono">
              +{formatCurrency(receiptTx.amount)}
            </p>

            <div className="flex justify-center gap-1.5">
              <Badge variant="success">Completed</Badge>
              {receiptTx.isMockData ? (
                <Badge variant="warning">
                  <Sparkles size={11} className="inline mr-1" />
                  Simulated Sandbox Demo
                </Badge>
              ) : (
                <Badge variant="indigo">Backend Confirmed</Badge>
              )}
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction ID:</span>
                <span className="font-mono font-medium text-slate-900">
                  {receiptTx.referenceId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Source:</span>
                <span className="text-slate-900">{receiptTx.senderName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Timestamp:</span>
                <span className="text-slate-900 font-mono">
                  {new Date(receiptTx.timestamp).toLocaleString()}
                </span>
              </div>
            </div>

            <Button
              variant="primary"
              fullWidth
              size="lg"
              onClick={() => setReceiptTx(null)}
            >
              Done
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
