import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBank } from '../context/BankContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Logo } from '../components/common/Logo';
import { formatCurrency, formatDate } from '../utils/formatters';
import { transactionService } from '../services/transactionService';
import type { Transaction } from '../types';
import {
  Printer,
  ArrowLeft,
  AlertCircle,
  Copy,
  Check,
  ShieldCheck,
  Building2,
  Clock,
  Sparkles,
} from 'lucide-react';

export const TransactionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getTransactionById } = useBank();

  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      return;
    }

    // Try finding in BankContext first, then transactionService
    const localTx = getTransactionById(id);
    if (localTx) {
      setTransaction(localTx);
      setIsLoading(false);
    } else {
      transactionService.getTransactionById(id).then((res) => {
        if (res.success && res.transaction) {
          setTransaction(res.transaction);
        } else {
          setTransaction(null);
        }
        setIsLoading(false);
      });
    }
  }, [id, getTransactionById]);

  const handleCopyRef = () => {
    if (transaction?.referenceId) {
      navigator.clipboard.writeText(transaction.referenceId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-500">Retrieving transaction details...</p>
      </div>
    );
  }

  // Not Found State
  if (!transaction) {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto shadow-sm">
          <AlertCircle size={32} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Transaction Not Found</h2>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            The transaction reference <code>&ldquo;{id}&rdquo;</code> could not be located in your history or backend records.
          </p>
        </div>
        <div className="pt-2">
          <Button variant="primary" onClick={() => navigate('/transactions')}>
            Back to Transaction History
          </Button>
        </div>
      </div>
    );
  }

  const isDebit = transaction.type === 'SEND';
  const isTopUp = transaction.type === 'ADD_MONEY';

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Top Action Bar (Hidden on print) */}
      <div className="no-print flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate('/transactions')}
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Transactions</span>
        </button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer size={15} />}
          >
            Print / Save PDF
          </Button>
        </div>
      </div>

      {/* Official Voucher / Receipt Card */}
      <Card
        padding="lg"
        className="print-receipt-card shadow-elevated bg-white border border-slate-200 overflow-hidden relative"
      >
        {/* Receipt Header Banner */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <Logo size="md" />
            <div>
              <p className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                Official Digital Receipt
              </p>
              <p className="text-xs font-mono text-slate-500">VaultPay Clearing Network</p>
            </div>
          </div>

          <div className="text-right">
            <Badge
              variant={
                transaction.status === 'SUCCESS'
                  ? 'success'
                  : transaction.status === 'PENDING'
                  ? 'warning'
                  : 'danger'
              }
              dot
            >
              {transaction.status === 'SUCCESS' ? 'Payment Completed' : transaction.status}
            </Badge>
          </div>
        </div>

        {/* Amount Display */}
        <div className="text-center py-6 bg-slate-50/70 rounded-2xl border border-slate-100 my-6 space-y-1">
          <p className="text-xs uppercase font-bold tracking-wider text-slate-500">
            {isDebit ? 'Transferred Amount' : isTopUp ? 'Wallet Deposit Amount' : 'Received Amount'}
          </p>
          <p
            className={`text-3xl sm:text-4xl font-extrabold font-mono ${
              isDebit ? 'text-slate-900' : 'text-emerald-600'
            }`}
          >
            {isDebit ? `- ${formatCurrency(transaction.amount)}` : `+ ${formatCurrency(transaction.amount)}`}
          </p>
          <p className="text-[11px] text-slate-400 font-medium">
            Currency: Indian Rupee (INR) • Simulated
          </p>
        </div>

        {/* Structured Transaction Data Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs py-2">
          {/* Reference ID with Copy */}
          <div className="space-y-1">
            <span className="text-slate-400 font-medium">Transaction Reference</span>
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-slate-800 text-sm">
                {transaction.referenceId}
              </span>
              <button
                type="button"
                onClick={handleCopyRef}
                className="no-print text-indigo-600 hover:text-indigo-800 p-1 rounded"
                title="Copy reference number"
              >
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          {/* Timestamp */}
          <div className="space-y-1">
            <span className="text-slate-400 font-medium">Payment Timestamp</span>
            <p className="text-slate-800 font-medium flex items-center gap-1.5">
              <Clock size={13} className="text-slate-400" />
              <span>{formatDate(transaction.timestamp)}</span>
            </p>
          </div>

          {/* Sender Details */}
          <div className="space-y-1">
            <span className="text-slate-400 font-medium">Sender Account</span>
            <p className="font-bold text-slate-800">{transaction.senderName}</p>
            <p className="font-mono text-[11px] text-slate-500">{transaction.senderVaultPayId}</p>
          </div>

          {/* Recipient Details */}
          <div className="space-y-1">
            <span className="text-slate-400 font-medium">Recipient Account</span>
            <p className="font-bold text-slate-800">{transaction.recipientName}</p>
            <p className="font-mono text-[11px] text-slate-500">{transaction.recipientVaultPayId}</p>
          </div>

          {/* Payment Method */}
          <div className="space-y-1">
            <span className="text-slate-400 font-medium">Payment Channel</span>
            <p className="text-slate-800 font-medium flex items-center gap-1.5">
              <Building2 size={13} className="text-slate-400" />
              <span>Bank Account ({transaction.bankAccountMasked || '•••• 9104'})</span>
            </p>
          </div>

          {/* Category */}
          <div className="space-y-1">
            <span className="text-slate-400 font-medium">Transaction Category</span>
            <p className="text-slate-800 font-medium">
              {transaction.category || 'General Payment'}
            </p>
          </div>
        </div>

        {/* Note / Narration */}
        {transaction.note && (
          <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-left">
            <span className="text-slate-400 font-medium block text-[10px] uppercase tracking-wider">
              Note / Description
            </span>
            <p className="text-slate-800 font-medium mt-0.5 italic">
              &ldquo;{transaction.note}&rdquo;
            </p>
          </div>
        )}

        {/* Status Badge Tag */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
            <span>VaultPay Simulated Clearance Protocol • 256-Bit Mock Verification</span>
          </div>

          {transaction.isMockData && (
            <div className="flex items-center gap-1 text-amber-700 font-semibold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              <Sparkles size={11} />
              <span>Simulated Sandbox Voucher</span>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
