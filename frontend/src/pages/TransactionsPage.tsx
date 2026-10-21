import React, { useState } from 'react';
import { useBank } from '../context/BankContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { formatCurrency, formatDate } from '../utils/formatters';
import type { Transaction } from '../types';
import {
  History,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  PlusCircle,
  Receipt,
  Download,
} from 'lucide-react';

export const TransactionsPage: React.FC = () => {
  const { transactions } = useBank();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'SEND' | 'RECEIVE' | 'ADD_MONEY'>('ALL');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Filter transactions
  const filtered = transactions.filter((tx) => {
    const matchesType = filterType === 'ALL' || tx.type === filterType;
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      tx.recipientName.toLowerCase().includes(query) ||
      tx.senderName.toLowerCase().includes(query) ||
      tx.recipientVaultPayId.toLowerCase().includes(query) ||
      tx.referenceId.toLowerCase().includes(query) ||
      (tx.note && tx.note.toLowerCase().includes(query));
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <History size={24} className="text-indigo-600" />
            <span>Transaction History</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track and download digital payment receipts for all transactions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download size={15} />}
            onClick={() => alert('Simulated transaction statement export initiated.')}
          >
            Export Statement
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card padding="sm" className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, VaultPay ID, or reference number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <Filter size={15} className="text-slate-400 shrink-0 ml-1 hidden sm:block" />
            {(['ALL', 'SEND', 'RECEIVE', 'ADD_MONEY'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                  filterType === type
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {type === 'ALL'
                  ? 'All Transactions'
                  : type === 'SEND'
                  ? 'Paid'
                  : type === 'RECEIVE'
                  ? 'Received'
                  : 'Top-ups'}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Transactions Table / List */}
      <Card padding="none" className="divide-y divide-slate-100 overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <p className="text-sm font-semibold text-slate-700">No matching transactions found</p>
            <p className="text-xs text-slate-400">Try adjusting your search terms or filters.</p>
          </div>
        ) : (
          filtered.map((tx) => {
            const isDebit = tx.type === 'SEND';
            const isTopUp = tx.type === 'ADD_MONEY';

            return (
              <div
                key={tx.id}
                onClick={() => setSelectedTx(tx)}
                className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                      isDebit
                        ? 'bg-rose-50 text-rose-600'
                        : isTopUp
                        ? 'bg-indigo-50 text-indigo-600'
                        : 'bg-emerald-50 text-emerald-600'
                    }`}
                  >
                    {isDebit ? (
                      <ArrowUpRight size={20} />
                    ) : isTopUp ? (
                      <PlusCircle size={20} />
                    ) : (
                      <ArrowDownLeft size={20} />
                    )}
                  </div>

                  <div className="space-y-0.5 text-left">
                    <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {isDebit
                        ? `Paid to ${tx.recipientName}`
                        : isTopUp
                        ? 'Added to Wallet'
                        : `Received from ${tx.senderName}`}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-2">
                      <span>{formatDate(tx.timestamp)}</span>
                      <span>•</span>
                      <span className="font-mono text-slate-400">{tx.referenceId}</span>
                    </p>
                  </div>
                </div>

                <div className="text-right space-y-1">
                  <p
                    className={`text-sm sm:text-base font-bold font-mono ${
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

      {/* Payment Receipt Modal */}
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
                {selectedTx.type === 'SEND' ? 'Payment to' : selectedTx.type === 'ADD_MONEY' ? 'Wallet Top-up' : 'Payment from'}
              </p>
              <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                {selectedTx.type === 'SEND' ? selectedTx.recipientName : selectedTx.senderName}
              </h3>
              <p className="text-xs font-mono text-slate-500">
                {selectedTx.type === 'SEND' ? selectedTx.recipientVaultPayId : selectedTx.senderVaultPayId}
              </p>
            </div>

            <div className="py-2">
              <p className="text-3xl font-extrabold text-slate-900 font-mono">
                {formatCurrency(selectedTx.amount)}
              </p>
              <div className="mt-1 flex items-center justify-center gap-1.5">
                <Badge variant="success">{selectedTx.status}</Badge>
                {selectedTx.isMockData && <Badge variant="warning">Simulated Sandbox</Badge>}
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
                <span className="text-slate-500">Payment Channel:</span>
                <span className="text-slate-900">Bank Account ({selectedTx.bankAccountMasked})</span>
              </div>
              {selectedTx.category && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Category:</span>
                  <span className="text-slate-900 font-medium">{selectedTx.category}</span>
                </div>
              )}
              {selectedTx.note && (
                <div className="flex justify-between border-t border-slate-200 pt-2">
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
                onClick={() => alert(`Simulated receipt exported: ${selectedTx.referenceId}`)}
              >
                Download Receipt
              </Button>
              <Button
                variant="primary"
                fullWidth
                size="sm"
                onClick={() => setSelectedTx(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
