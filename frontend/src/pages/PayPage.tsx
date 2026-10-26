import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBank } from '../context/BankContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Alert } from '../components/common/Alert';
import { Modal } from '../components/common/Modal';
import { Badge } from '../components/common/Badge';
import { PendingIntegrationModal } from '../components/common/PendingIntegrationModal';
import { isValidVaultPayId, formatCurrency } from '../utils/formatters';
import { paymentService, type RecipientLookupResult } from '../services/paymentService';
import type { Transaction, SendPaymentPayload } from '../types';
import {
  Send,
  CheckCircle2,
  ShieldCheck,
  UserCheck,
  AlertTriangle,
  ArrowRight,
  Eye,
  EyeOff,
  Landmark,
  Sparkles,
} from 'lucide-react';

const QUICK_AMOUNTS = [100, 500, 1000, 2000];

export const PayPage: React.FC = () => {
  const { user } = useAuth();
  const {
    bankAccounts,
    primaryAccount,
    contacts,
    sendPayment,
    simulateOfflineSandboxPayment,
  } = useBank();

  // Form inputs
  const [recipientId, setRecipientId] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [selectedBankId, setSelectedBankId] = useState(
    primaryAccount?.id || (bankAccounts[0]?.id || '')
  );
  const [pin, setPin] = useState('1234');
  const [showPin, setShowPin] = useState(false);

  // Recipient lookup states
  const [lookupResult, setLookupResult] = useState<RecipientLookupResult | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Review & Confirmation step
  const [showReviewModal, setShowReviewModal] = useState(false);

  // Submission & Pending Integration states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [receiptTx, setReceiptTx] = useState<Transaction | null>(null);
  const [pendingModalData, setPendingModalData] = useState<{
    isOpen: boolean;
    payload?: SendPaymentPayload;
    endpoint: string;
  }>({
    isOpen: false,
    endpoint: '/api/payments',
  });

  const selectedBank =
    bankAccounts.find((b) => b.id === selectedBankId) || primaryAccount;

  // Sync default bank when primary changes
  useEffect(() => {
    if (primaryAccount && !selectedBankId) {
      setSelectedBankId(primaryAccount.id);
    }
  }, [primaryAccount, selectedBankId]);

  // Recipient lookup handler
  const handleLookupRecipient = useCallback(async (vpaToLookup: string) => {
    const clean = vpaToLookup.trim().toLowerCase();
    if (!isValidVaultPayId(clean)) {
      setLookupResult(null);
      setLookupError(null);
      return;
    }

    if (user && clean === user.vaultPayId.toLowerCase()) {
      setLookupResult(null);
      setLookupError('You cannot transfer money to your own VaultPay ID.');
      return;
    }

    setIsLookingUp(true);
    setLookupError(null);

    try {
      const res = await paymentService.lookupRecipient(clean);
      setLookupResult(res);
      if (!res.found) {
        setLookupError(res.error || 'Recipient not found.');
      }
    } catch {
      setLookupError('Network error while validating recipient.');
    } finally {
      setIsLookingUp(false);
    }
  }, [user]);

  // Trigger lookup automatically when valid ID is entered
  useEffect(() => {
    const timer = setTimeout(() => {
      if (isValidVaultPayId(recipientId)) {
        handleLookupRecipient(recipientId);
      } else {
        setLookupResult(null);
        if (recipientId.trim().length > 0 && !recipientId.includes('@')) {
          setLookupError('VaultPay ID must end in @vault or @vp (e.g. priya@vault)');
        } else {
          setLookupError(null);
        }
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [recipientId, handleLookupRecipient]);

  // Quick contact selector
  const handleSelectRecent = (vpa: string) => {
    setRecipientId(vpa);
    setErrorMessage(null);
    handleLookupRecipient(vpa);
  };

  // Pre-payment validation before opening Review Summary
  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('Please enter a valid transfer amount greater than ₹0.');
      return;
    }

    if (!isValidVaultPayId(recipientId)) {
      setErrorMessage('Please enter a valid VaultPay ID (e.g. name@vault or user@vp).');
      return;
    }

    if (user && recipientId.trim().toLowerCase() === user.vaultPayId.toLowerCase()) {
      setErrorMessage('You cannot send payments to your own account.');
      return;
    }

    if (!selectedBank) {
      setErrorMessage('Please select or link a bank account before making a payment.');
      return;
    }

    if (selectedBank.balance < numAmount) {
      setErrorMessage(
        `Insufficient balance in ${selectedBank.bankName}. Available: ${formatCurrency(
          selectedBank.balance
        )}, required: ${formatCurrency(numAmount)}.`
      );
      return;
    }

    // Open review modal
    setShowReviewModal(true);
  };

  // Execute payment authorization
  const handleConfirmAndPay = async () => {
    if (isSubmitting) return; // Prevent duplicate clicks

    const numAmount = parseFloat(amount);
    if (!selectedBank) return;

    if (!pin || pin.length < 4) {
      setErrorMessage('Please enter your 4 or 6-digit security PIN.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const payload: SendPaymentPayload = {
      recipientVaultPayId: recipientId.trim().toLowerCase(),
      amount: numAmount,
      note: note.trim() || undefined,
      sourceBankAccountId: selectedBank.id,
      pin,
    };

    try {
      const res = await sendPayment(payload);

      if (res.success && res.transaction) {
        // Backend confirmed transaction
        setShowReviewModal(false);
        setReceiptTx(res.transaction);
        // Reset form
        setAmount('');
        setNote('');
      } else if (res.isPendingIntegration) {
        // Honest integration-pending modal (backend is offline)
        setShowReviewModal(false);
        setPendingModalData({
          isOpen: true,
          payload,
          endpoint: '/api/payments',
        });
      } else {
        setErrorMessage(res.error || 'Payment failed.');
      }
    } catch {
      setErrorMessage('An unexpected error occurred while communicating with the payment service.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Explicit sandbox simulation for offline preview
  const handleSimulateSandbox = () => {
    if (!pendingModalData.payload) return;
    const res = simulateOfflineSandboxPayment(pendingModalData.payload);
    setPendingModalData({ ...pendingModalData, isOpen: false });
    if (res.success && res.transaction) {
      setReceiptTx(res.transaction);
      setAmount('');
      setNote('');
    }
  };

  const parsedAmount = parseFloat(amount) || 0;
  const isOverBalance = selectedBank ? parsedAmount > selectedBank.balance : false;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Send size={24} className="text-indigo-600" />
          <span>Pay by VaultPay ID</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Instant, secure payment to any verified recipient using their VaultPay identifier
        </p>
      </div>

      {/* Recent Contacts Chips */}
      <Card padding="md" className="space-y-3">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 block">
          Frequent Payees
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {contacts.slice(0, 4).map((c) => {
            const isSelected = recipientId.toLowerCase() === c.vaultPayId.toLowerCase();
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelectRecent(c.vaultPayId)}
                className={`p-2.5 rounded-xl border text-center transition-all focus:outline-none focus:ring-2 focus:ring-indigo-600 ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/80 ring-2 ring-indigo-600/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-full ${c.avatarBg} ${c.avatarColor} font-bold text-xs flex items-center justify-center mx-auto mb-1.5 shadow-sm`}
                >
                  {c.initials}
                </div>
                <p className="text-xs font-bold text-slate-800 truncate">{c.name}</p>
                <p className="text-[10px] text-slate-500 font-mono truncate">{c.vaultPayId}</p>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Main Payment Form Card */}
      <Card padding="lg" className="shadow-elevated space-y-5">
        {errorMessage && (
          <Alert variant="danger" title="Payment Error">
            {errorMessage}
          </Alert>
        )}

        <form onSubmit={handleProceedToReview} className="space-y-4">
          {/* Recipient Input */}
          <div>
            <Input
              id="recipientId"
              name="recipientId"
              label="Recipient VaultPay ID"
              placeholder="e.g. priya@vault or rohan@vp"
              value={recipientId}
              onChange={(e) => {
                setRecipientId(e.target.value);
                setErrorMessage(null);
              }}
              required
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck="false"
              helperText={lookupError || undefined}
              rightAction={
                isLookingUp ? (
                  <span className="text-[11px] text-slate-400 animate-pulse font-medium">
                    Looking up...
                  </span>
                ) : lookupResult?.found ? (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                    <UserCheck size={13} />
                    Verified
                  </span>
                ) : null
              }
            />

            {/* Verified Recipient Identity Confirmation Banner */}
            {lookupResult?.found && lookupResult.recipient && (
              <div className="mt-2.5 p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between gap-3 animate-fadeIn">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full ${lookupResult.recipient.avatarBg} ${lookupResult.recipient.avatarColor} font-bold text-xs flex items-center justify-center shrink-0 shadow-sm`}
                  >
                    {lookupResult.recipient.initials}
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-slate-900 leading-snug">
                        {lookupResult.recipient.name}
                      </p>
                      {lookupResult.recipient.isMerchant && (
                        <Badge variant="indigo">Merchant</Badge>
                      )}
                    </div>
                    <p className="text-xs font-mono text-indigo-700">
                      {lookupResult.recipient.vaultPayId}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  {lookupResult.isBackendConfirmed ? (
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full inline-block">
                      Live Backend Verified
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-full inline-block">
                      Demo Directory
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Amount Input with Currency Symbol and Real-Time Balance Check */}
          <div className="space-y-1.5 text-left">
            <div className="flex items-center justify-between">
              <label
                htmlFor="amount"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Payment Amount (INR)
              </label>
              {selectedBank && (
                <span
                  className={`text-[11px] font-medium ${
                    isOverBalance ? 'text-rose-600 font-bold' : 'text-slate-500'
                  }`}
                >
                  Balance: {formatCurrency(selectedBank.balance)}
                </span>
              )}
            </div>

            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-xl font-bold text-slate-400">₹</span>
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
                  setErrorMessage(null);
                }}
                required
                className={`w-full rounded-xl border bg-white pl-8 pr-3.5 py-3 text-2xl font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 placeholder:text-slate-300 transition-colors ${
                  isOverBalance
                    ? 'border-rose-400 focus:ring-rose-500'
                    : 'border-slate-200 focus:ring-indigo-600 focus:border-indigo-600'
                }`}
              />
            </div>

            {/* Quick amount suggestion chips */}
            <div className="flex gap-2 pt-1">
              {QUICK_AMOUNTS.map((chipAmt) => (
                <button
                  key={chipAmt}
                  type="button"
                  onClick={() => setAmount(chipAmt.toString())}
                  className={`flex-1 py-1 text-xs font-semibold rounded-lg border transition-all ${
                    amount === chipAmt.toString()
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  +₹{chipAmt}
                </button>
              ))}
            </div>

            {isOverBalance && (
              <p className="text-xs text-rose-600 flex items-center gap-1 font-medium mt-1">
                <AlertTriangle size={13} />
                <span>
                  Amount exceeds available bank balance by{' '}
                  {formatCurrency(parsedAmount - (selectedBank?.balance || 0))}
                </span>
              </p>
            )}
          </div>

          {/* Payment Note (Optional) */}
          <Input
            id="note"
            name="note"
            label="Payment Note (Optional)"
            placeholder="e.g. Dinner split, Book purchase"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={60}
          />

          {/* Source Bank Account Selector */}
          <div className="space-y-1.5 text-left pt-1">
            <label
              htmlFor="sourceBank"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
            >
              Debit From Linked Bank
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
                  {b.bankName} ({b.maskedAccountNumber}) — {formatCurrency(b.balance)}
                </option>
              ))}
            </select>
          </div>

          {/* Review & Proceed Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={isOverBalance || parsedAmount <= 0 || !recipientId}
            rightIcon={<ArrowRight size={18} />}
            className="mt-3"
          >
            Review &amp; Pay {parsedAmount > 0 ? formatCurrency(parsedAmount) : ''}
          </Button>
        </form>
      </Card>

      {/* Review Summary Modal (Confirmation before debiting) */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title="Confirm Payment Details"
      >
        <div className="space-y-5 text-left">
          {/* Transfer Summary Card */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="text-center py-1">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
                You are sending
              </span>
              <p className="text-3xl font-extrabold text-slate-900 font-mono mt-0.5">
                {formatCurrency(parsedAmount)}
              </p>
            </div>

            <div className="border-t border-slate-200 pt-3 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">To Recipient:</span>
                <span className="font-semibold text-slate-900">
                  {lookupResult?.recipient?.name || recipientId}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">VaultPay ID:</span>
                <span className="font-mono text-indigo-700 font-medium">{recipientId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">From Account:</span>
                <span className="text-slate-900 font-medium flex items-center gap-1">
                  <Landmark size={13} className="text-slate-400" />
                  {selectedBank?.bankName} ({selectedBank?.maskedAccountNumber})
                </span>
              </div>
              {note && (
                <div className="flex justify-between items-center border-t border-slate-200/80 pt-2">
                  <span className="text-slate-500">Note:</span>
                  <span className="italic text-slate-800 font-medium">{note}</span>
                </div>
              )}
            </div>
          </div>

          {/* UPI Security PIN Input */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label
                htmlFor="reviewPin"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Enter Simulated Security PIN
              </label>
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium"
              >
                {showPin ? <EyeOff size={13} /> : <Eye size={13} />}
                <span>{showPin ? 'Hide' : 'Show'}</span>
              </button>
            </div>
            <Input
              id="reviewPin"
              name="reviewPin"
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

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              fullWidth
              onClick={() => setShowReviewModal(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              fullWidth
              isLoading={isSubmitting}
              disabled={isSubmitting || !pin}
              onClick={handleConfirmAndPay}
              leftIcon={<ShieldCheck size={18} />}
            >
              Authorize &amp; Pay
            </Button>
          </div>
        </div>
      </Modal>

      {/* Honest Backend Integration Pending Modal */}
      <PendingIntegrationModal
        isOpen={pendingModalData.isOpen}
        onClose={() => setPendingModalData({ ...pendingModalData, isOpen: false })}
        operationName="Payment Transfer"
        endpoint={pendingModalData.endpoint}
        payload={pendingModalData.payload as unknown as Record<string, unknown>}
        onRetry={handleConfirmAndPay}
        onSimulateSandbox={handleSimulateSandbox}
        isRetrying={isSubmitting}
      />

      {/* Success Receipt Modal */}
      {receiptTx && (
        <Modal
          isOpen={Boolean(receiptTx)}
          onClose={() => setReceiptTx(null)}
          title="Payment Receipt"
        >
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 size={36} />
            </div>

            <div>
              <p className="text-xs uppercase font-bold tracking-wider text-slate-400">
                Paid Successfully to
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
                {receiptTx.isMockData ? (
                  <Badge variant="warning">
                    <Sparkles size={11} className="inline mr-1" />
                    Simulated Sandbox Demo
                  </Badge>
                ) : (
                  <Badge variant="indigo">Live Backend Confirmed</Badge>
                )}
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction ID:</span>
                <span className="font-mono font-medium text-slate-900">
                  {receiptTx.referenceId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Debited From:</span>
                <span className="text-slate-900">
                  Bank Account ({receiptTx.bankAccountMasked})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Timestamp:</span>
                <span className="text-slate-900 font-mono">
                  {new Date(receiptTx.timestamp).toLocaleString()}
                </span>
              </div>
              {receiptTx.note && (
                <div className="flex justify-between border-t border-slate-200/80 pt-2">
                  <span className="text-slate-500">Note:</span>
                  <span className="text-slate-900 italic font-medium">
                    {receiptTx.note}
                  </span>
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
