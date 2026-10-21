import React, { useState } from 'react';
import { useBank } from '../context/BankContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Alert } from '../components/common/Alert';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { isValidVaultPayId, formatCurrency } from '../utils/formatters';
import type { Transaction } from '../types';
import { Send, CheckCircle2, ShieldCheck, UserCheck } from 'lucide-react';

const RECENT_CONTACTS = [
  { name: 'Priya Verma', vpa: 'priya@vault', avatarBg: 'bg-rose-500' },
  { name: 'Rohan Mehta', vpa: 'rohan@vp', avatarBg: 'bg-indigo-500' },
  { name: 'Metro Groceries', vpa: 'groceries@vault', avatarBg: 'bg-emerald-500' },
  { name: 'Urban Tech', vpa: 'urbantech@vp', avatarBg: 'bg-amber-500' },
];

export const PayPage: React.FC = () => {
  const { bankAccounts, primaryAccount, sendPayment } = useBank();

  const [recipientId, setRecipientId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [selectedBankId, setSelectedBankId] = useState(primaryAccount?.id || (bankAccounts[0]?.id || ''));
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [receiptTx, setReceiptTx] = useState<Transaction | null>(null);

  const selectedBank = bankAccounts.find((b) => b.id === selectedBankId) || primaryAccount;

  const handleSelectContact = (vpa: string) => {
    setRecipientId(vpa);
    setError(null);
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount greater than ₹0.');
      return;
    }

    if (!isValidVaultPayId(recipientId)) {
      setError('Recipient must have a valid VaultPay ID ending in @vault or @vp.');
      return;
    }

    if (!pin || pin.length < 4) {
      setError('Please enter your 4-digit UPI/Security PIN to authenticate.');
      return;
    }

    if (!selectedBank) {
      setError('Please select or link a bank account to pay from.');
      return;
    }

    if (selectedBank.balance < numAmount) {
      setError(`Insufficient funds in ${selectedBank.bankName}. Available: ${formatCurrency(selectedBank.balance)}`);
      return;
    }

    setIsLoading(true);

    try {
      const res = await sendPayment({
        recipientVaultPayId: recipientId,
        amount: numAmount,
        note,
        sourceBankAccountId: selectedBank.id,
        pin,
      });

      if (res.success && res.transaction) {
        setReceiptTx(res.transaction);
        // Reset form
        setAmount('');
        setNote('');
        setPin('');
      } else {
        setError(res.error || 'Payment failed.');
      }
    } catch {
      setError('A network or system error occurred while processing the payment.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Send size={24} className="text-indigo-600" />
          <span>Pay People</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Instantly transfer simulated funds to any recipient using their VaultPay ID
        </p>
      </div>

      {/* Frequent Contacts / Recent Payees */}
      <Card padding="md" className="space-y-3">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 block">
          Recent Payees
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {RECENT_CONTACTS.map((c) => (
            <button
              key={c.vpa}
              type="button"
              onClick={() => handleSelectContact(c.vpa)}
              className={`p-2.5 rounded-xl border text-center transition-all ${
                recipientId.toLowerCase() === c.vpa.toLowerCase()
                  ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-600/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className={`w-8 h-8 rounded-full ${c.avatarBg} text-white font-bold text-xs flex items-center justify-center mx-auto mb-1.5`}>
                {c.name.slice(0, 2).toUpperCase()}
              </div>
              <p className="text-xs font-bold text-slate-800 line-clamp-1">{c.name}</p>
              <p className="text-[10px] text-slate-500 font-mono line-clamp-1">{c.vpa}</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Payment Form */}
      <Card padding="lg" className="shadow-elevated space-y-5">
        {error && (
          <Alert variant="danger" title="Payment Authorization Error">
            {error}
          </Alert>
        )}

        <form onSubmit={handlePay} method="POST" className="space-y-4">
          <Input
            id="recipientId"
            name="recipientId"
            label="Recipient VaultPay ID"
            placeholder="e.g. priya@vault or rohan@vp"
            value={recipientId}
            onChange={(e) => {
              setRecipientId(e.target.value);
              setError(null);
            }}
            required
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
            rightAction={
              isValidVaultPayId(recipientId) ? (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <UserCheck size={13} />
                  Valid ID
                </span>
              ) : null
            }
          />

          <div className="space-y-1.5 text-left">
            <label htmlFor="amount" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Amount (INR)
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-lg font-bold text-slate-400">₹</span>
              <input
                id="amount"
                name="amount"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9.]/g, '');
                  setAmount(val);
                }}
                required
                className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3.5 py-3 text-2xl font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 placeholder:text-slate-300"
              />
            </div>
          </div>

          <Input
            id="note"
            name="note"
            label="Payment Note / Description (Optional)"
            placeholder="What is this payment for? (e.g. Lunch split)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={60}
          />

          {/* Payment Method Selector */}
          <div className="space-y-1.5 text-left pt-1">
            <label htmlFor="sourceBank" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Pay From Linked Bank
            </label>
            <select
              id="sourceBank"
              name="sourceBank"
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
              <p className="text-[11px] text-slate-500 flex items-center justify-between mt-1">
                <span>Available Bank Balance:</span>
                <span className="font-mono font-semibold text-slate-800">{formatCurrency(selectedBank.balance)}</span>
              </p>
            )}
          </div>

          {/* UPI PIN entry */}
          <div className="pt-2">
            <Input
              id="pin"
              name="pin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              label="Simulated UPI PIN (4 or 6 digits)"
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              required
              helperText="Enter your simulated security PIN (demo default: 1234)"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isLoading}
            leftIcon={<ShieldCheck size={18} />}
            className="mt-4"
          >
            Authorize & Pay {amount ? formatCurrency(parseFloat(amount) || 0) : ''}
          </Button>
        </form>
      </Card>

      {/* Success Receipt Modal */}
      {receiptTx && (
        <Modal
          isOpen={Boolean(receiptTx)}
          onClose={() => setReceiptTx(null)}
          title="Payment Successful"
        >
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 size={36} />
            </div>

            <div>
              <p className="text-xs uppercase font-bold tracking-wider text-slate-400">
                Paid to
              </p>
              <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                {receiptTx.recipientName}
              </h3>
              <p className="text-xs font-mono text-slate-500">
                {receiptTx.recipientVaultPayId}
              </p>
            </div>

            <div>
              <p className="text-3xl font-extrabold text-slate-900 font-mono">
                {formatCurrency(receiptTx.amount)}
              </p>
              <div className="mt-1 flex items-center justify-center gap-1.5">
                <Badge variant="success">Completed</Badge>
                {receiptTx.isMockData && (
                  <Badge variant="warning">Simulated Sandbox</Badge>
                )}
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction ID:</span>
                <span className="font-mono font-medium text-slate-900">{receiptTx.referenceId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Debited From:</span>
                <span className="text-slate-900">Bank Account ({receiptTx.bankAccountMasked})</span>
              </div>
              {receiptTx.note && (
                <div className="flex justify-between border-t border-slate-200/80 pt-2">
                  <span className="text-slate-500">Note:</span>
                  <span className="text-slate-900 italic font-medium">{receiptTx.note}</span>
                </div>
              )}
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
