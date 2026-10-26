import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBank } from '../context/BankContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { formatCurrency, formatDate } from '../utils/formatters';
import type { Transaction, TransactionType, TransactionStatus } from '../types';
import {
  History,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  PlusCircle,
  Receipt,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Printer,
  X,
  Sparkles,
} from 'lucide-react';

type DateRangeFilter = 'ALL' | 'TODAY' | 'THIS_WEEK' | 'THIS_MONTH';
type SortOption = 'DATE_DESC' | 'DATE_ASC' | 'AMOUNT_DESC' | 'AMOUNT_ASC';

const PAGE_SIZE = 8;

export const TransactionsPage: React.FC = () => {
  const { transactions } = useBank();
  const navigate = useNavigate();

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<TransactionType | 'ALL'>('ALL');
  const [filterStatus, setFilterStatus] = useState<TransactionStatus | 'ALL'>('ALL');
  const [dateRange, setDateRange] = useState<DateRangeFilter>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('DATE_DESC');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Quick detail modal
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    return transactions
      .filter((tx) => {
        // Type filter
        if (filterType !== 'ALL' && tx.type !== filterType) {
          return false;
        }

        // Status filter
        if (filterStatus !== 'ALL' && tx.status !== filterStatus) {
          return false;
        }

        // Date range filter
        if (dateRange !== 'ALL') {
          const txDate = new Date(tx.timestamp);
          const now = new Date();

          if (dateRange === 'TODAY') {
            const isToday =
              txDate.getDate() === now.getDate() &&
              txDate.getMonth() === now.getMonth() &&
              txDate.getFullYear() === now.getFullYear();
            if (!isToday) return false;
          } else if (dateRange === 'THIS_WEEK') {
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            if (txDate < oneWeekAgo) return false;
          } else if (dateRange === 'THIS_MONTH') {
            const isThisMonth =
              txDate.getMonth() === now.getMonth() &&
              txDate.getFullYear() === now.getFullYear();
            if (!isThisMonth) return false;
          }
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matches =
            tx.recipientName.toLowerCase().includes(q) ||
            tx.senderName.toLowerCase().includes(q) ||
            tx.recipientVaultPayId.toLowerCase().includes(q) ||
            tx.senderVaultPayId.toLowerCase().includes(q) ||
            tx.referenceId.toLowerCase().includes(q) ||
            (tx.note && tx.note.toLowerCase().includes(q)) ||
            (tx.category && tx.category.toLowerCase().includes(q));
          if (!matches) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'DATE_DESC') {
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        }
        if (sortBy === 'DATE_ASC') {
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        }
        if (sortBy === 'AMOUNT_DESC') {
          return b.amount - a.amount;
        }
        if (sortBy === 'AMOUNT_ASC') {
          return a.amount - b.amount;
        }
        return 0;
      });
  }, [transactions, filterType, filterStatus, dateRange, searchQuery, sortBy]);

  // Calculate pagination
  const totalItems = filteredTransactions.length;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE) || 1;
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * PAGE_SIZE;
  const paginatedTransactions = filteredTransactions.slice(
    startIndex,
    startIndex + PAGE_SIZE
  );

  const handleResetFilters = () => {
    setSearchQuery('');
    setFilterType('ALL');
    setFilterStatus('ALL');
    setDateRange('ALL');
    setSortBy('DATE_DESC');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    searchQuery ||
    filterType !== 'ALL' ||
    filterStatus !== 'ALL' ||
    dateRange !== 'ALL' ||
    sortBy !== 'DATE_DESC';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <History size={24} className="text-indigo-600" />
            <span>Transaction History</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Search, filter, and print verifiable receipts for all payment activity
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Printer size={15} />}
            onClick={() => window.print()}
          >
            Print Statement
          </Button>
        </div>
      </div>

      {/* Search, Filter, and Sort Toolbar */}
      <Card padding="md" className="space-y-3.5">
        {/* Top Search Input */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search by payee name, VaultPay ID, reference number, or note..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
        </div>

        {/* Filters Controls Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
          {/* Type Filter */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Type
            </label>
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value as TransactionType | 'ALL');
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="ALL">All Payment Types</option>
              <option value="SEND">Paid (Debit)</option>
              <option value="RECEIVE">Received (Credit)</option>
              <option value="ADD_MONEY">Top-up (Deposit)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value as TransactionStatus | 'ALL');
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUCCESS">Completed (Success)</option>
              <option value="PENDING">Pending</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Date Range
            </label>
            <select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value as DateRangeFilter);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="ALL">All Time</option>
              <option value="TODAY">Today Only</option>
              <option value="THIS_WEEK">Past 7 Days</option>
              <option value="THIS_MONTH">This Month</option>
            </select>
          </div>

          {/* Sort By */}
          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as SortOption);
                setCurrentPage(1);
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="DATE_DESC">Newest First</option>
              <option value="DATE_ASC">Oldest First</option>
              <option value="AMOUNT_DESC">Highest Amount</option>
              <option value="AMOUNT_ASC">Lowest Amount</option>
            </select>
          </div>
        </div>

        {/* Filter Pills / Reset */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
            <span className="text-slate-500 font-medium">
              Showing {totalItems} matching transaction{totalItems === 1 ? '' : 's'}
            </span>
            <button
              type="button"
              onClick={handleResetFilters}
              className="text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1"
            >
              <X size={13} />
              <span>Reset Filters</span>
            </button>
          </div>
        )}
      </Card>

      {/* Transactions List */}
      <Card padding="none" className="divide-y divide-slate-100 overflow-hidden shadow-sm">
        {paginatedTransactions.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <History size={24} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">No Transactions Found</p>
              <p className="text-xs text-slate-500 mt-0.5">
                No payment records match your active search and filter criteria.
              </p>
            </div>
            {hasActiveFilters && (
              <Button size="sm" variant="outline" onClick={handleResetFilters}>
                Clear All Filters
              </Button>
            )}
          </div>
        ) : (
          paginatedTransactions.map((tx) => {
            const isDebit = tx.type === 'SEND';
            const isTopUp = tx.type === 'ADD_MONEY';

            return (
              <div
                key={tx.id}
                onClick={() => setSelectedTx(tx)}
                className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50/80 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
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
                    <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                      <span>
                        {isDebit
                          ? `Paid to ${tx.recipientName}`
                          : isTopUp
                          ? 'Added to Wallet'
                          : `Received from ${tx.senderName}`}
                      </span>
                    </p>
                    <p className="text-xs text-slate-500 flex flex-wrap items-center gap-1.5">
                      <span>{formatDate(tx.timestamp)}</span>
                      <span>•</span>
                      <span className="font-mono text-slate-400">{tx.referenceId}</span>
                      {tx.note && (
                        <>
                          <span>•</span>
                          <span className="italic truncate max-w-[140px] text-slate-600">
                            &ldquo;{tx.note}&rdquo;
                          </span>
                        </>
                      )}
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
                      variant={
                        tx.status === 'SUCCESS'
                          ? 'success'
                          : tx.status === 'PENDING'
                          ? 'warning'
                          : 'danger'
                      }
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

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 px-1">
          <span>
            Showing {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, totalItems)} of {totalItems}
          </span>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={validPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              leftIcon={<ChevronLeft size={14} />}
            >
              Previous
            </Button>

            <span className="px-2 font-semibold text-slate-700">
              {validPage} / {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              disabled={validPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              rightIcon={<ChevronRight size={14} />}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Quick Detail Modal with Link to Full Official Receipt */}
      {selectedTx && (
        <Modal
          isOpen={Boolean(selectedTx)}
          onClose={() => setSelectedTx(null)}
          title="Payment Details"
        >
          <div className="text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <Receipt size={28} />
            </div>

            <div>
              <p className="text-xs uppercase font-bold tracking-wider text-slate-400">
                {selectedTx.type === 'SEND'
                  ? 'Payment to'
                  : selectedTx.type === 'ADD_MONEY'
                  ? 'Wallet Top-up'
                  : 'Payment from'}
              </p>
              <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                {selectedTx.type === 'SEND' ? selectedTx.recipientName : selectedTx.senderName}
              </h3>
              <p className="text-xs font-mono text-slate-500">
                {selectedTx.type === 'SEND'
                  ? selectedTx.recipientVaultPayId
                  : selectedTx.senderVaultPayId}
              </p>
            </div>

            <div className="py-2">
              <p className="text-3xl font-extrabold text-slate-900 font-mono">
                {formatCurrency(selectedTx.amount)}
              </p>
              <div className="mt-1 flex items-center justify-center gap-1.5">
                <Badge variant="success">{selectedTx.status}</Badge>
                {selectedTx.isMockData && (
                  <Badge variant="warning">
                    <Sparkles size={11} className="inline mr-1" />
                    Simulated Sandbox
                  </Badge>
                )}
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Reference ID:</span>
                <span className="font-mono font-medium text-slate-900">
                  {selectedTx.referenceId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date & Time:</span>
                <span className="text-slate-900">{formatDate(selectedTx.timestamp)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Channel:</span>
                <span className="text-slate-900">
                  Bank Account ({selectedTx.bankAccountMasked || '•••• 9104'})
                </span>
              </div>
              {selectedTx.category && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Category:</span>
                  <span className="text-slate-900 font-medium">{selectedTx.category}</span>
                </div>
              )}
              {selectedTx.note && (
                <div className="flex justify-between border-t border-slate-200/80 pt-2">
                  <span className="text-slate-500">Note:</span>
                  <span className="text-slate-900 italic font-medium">{selectedTx.note}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <Button
                variant="primary"
                fullWidth
                size="sm"
                leftIcon={<ExternalLink size={15} />}
                onClick={() => {
                  setSelectedTx(null);
                  navigate(`/transactions/${selectedTx.id}`);
                }}
              >
                View Full Receipt &amp; Print
              </Button>
              <Button
                variant="outline"
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
