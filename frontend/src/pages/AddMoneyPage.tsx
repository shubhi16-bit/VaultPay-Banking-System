import React, { useState } from 'react';
import { useBank } from '../context/BankContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Alert } from '../components/common/Alert';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { formatCurrency } from '../utils/formatters';
import type { Transaction } from '../types';
import { PlusCircle, Landmark, ShieldCheck, CheckCircle2 } from 'lucide-react';

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

export const AddMoneyPage: React.FC = () => {
  const { bankAccounts, primaryAccount, walletBalance, addMoney } = useBank();

  const [amount, setAmount] = useState('1000');
  const [selectedBankId, setSelectedBankId] = useState(primaryAccount?.id || (bankAccounts[0]?.id || ''));
  const [pin, setPin] = useState('1234');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [receiptTx, setReceiptTx] = useState<Transaction | null>(null);

  const selectedBank = bankAccounts.find((b) => b.id === selectedBankId) || primaryAccount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount.');
      return;
    }

    if (!selectedBank) {
      setError('No linked bank account selected.');
      return;
    }

    if (selectedBank.balance < numAmount) {
      setError(`Insufficient bank balance. Available in ${selectedBank.bankName}: ${formatCurrency(selectedBank.balance)}`);
      return;
    }

    if (!pin || pin.length < 4) {
      setError('Enter your 4 or 6-digit simulated security PIN.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await addMoney({
        amount: numAmount,
        bankAccountId: selectedBank.id,
        pin,
      });

      if (res.success && res.transaction) {
        setReceiptTx(res.transaction);
        setAmount('');
      } else {
        setError(res.error || 'Failed to add money.');
      }
    } catch {
      setError('An error occurred during wallet top-up.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <PlusCircle size={24} className="text-emerald-600" />
          <span>Add Simulated Money</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Top up your VaultPay wallet from any linked bank account
        </p>
      </div>

      {/* Wallet Balance Highlight */}
      <Card variant="accent" padding="md" className="flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
            Current Wallet Balance
          </p>
          <p className="text-2xl font-extrabold text-slate-900">
            {formatCurrency(walletBalance)}
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center">
          <PlusCircle size={20} />
        </div>
      </Card>

      {/* Form Card */}
      <Card padding="lg" className="shadow-elevated space-y-5">
        {error && <Alert variant="danger">{error}</Alert>}

        <form onSubmit={handleSubmit} method="POST" className="space-y-5">
          {/* Amount input */}
          <div className="space-y-1.5 text-left">
            <label htmlFor="topupAmount" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Amount to Add (INR)
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-lg font-bold text-slate-400">₹</span>
              <input
                id="topupAmount"
                name="amount"
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                required
                className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3.5 py-3 text-2xl font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
            </div>
          </div>

          {/* Quick preset chips */}
          <div className="flex gap-2">
            {QUICK_AMOUNTS.map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setAmount(amt.toString())}
                className={`flex-1 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                  amount === amt.toString()
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                +₹{amt}
              </button>
            ))}
          </div>

          {/* Bank selector */}
          <div className="space-y-1.5 text-left">
            <label htmlFor="bankSelect" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Debit From Bank
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
                <span>Available balance in bank: <strong>{formatCurrency(selectedBank.balance)}</strong></span>
              </p>
            )}
          </div>

          {/* PIN input */}
          <Input
            id="pin"
            name="pin"
            type="password"
            inputMode="numeric"
            maxLength={6}
            label="Simulated UPI PIN"
            placeholder="••••"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            required
            helperText="Default sandbox PIN: 1234"
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isLoading}
            leftIcon={<ShieldCheck size={18} />}
          >
            Authorize & Add {amount ? formatCurrency(parseFloat(amount) || 0) : ''}
          </Button>
        </form>
      </Card>

      {/* Top-up Receipt Modal */}
      {receiptTx && (
        <Modal
          isOpen={Boolean(receiptTx)}
          onClose={() => setReceiptTx(null)}
          title="Money Added to Wallet"
        >
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 size={36} />
            </div>

            <div>
              <p className="text-xs uppercase font-bold text-slate-400">Added to</p>
              <h3 className="text-xl font-bold text-slate-900">VaultPay Wallet</h3>
              <p className="text-xs font-mono text-slate-500">New Balance: {formatCurrency(walletBalance)}</p>
            </div>

            <p className="text-3xl font-extrabold text-slate-900 font-mono">
              +{formatCurrency(receiptTx.amount)}
            </p>

            <div className="flex justify-center">
              <Badge variant="success">Completed</Badge>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Reference:</span>
                <span className="font-mono font-medium">{receiptTx.referenceId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Source:</span>
                <span>{receiptTx.senderName}</span>
              </div>
            </div>

            <Button variant="primary" fullWidth size="lg" onClick={() => setReceiptTx(null)}>
              Done
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
