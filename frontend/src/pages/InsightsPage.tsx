import React, { useState, useMemo } from 'react';
import { useBank } from '../context/BankContext';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { formatCurrency } from '../utils/formatters';
import type { SpendingCategorySummary } from '../types';
import {
  PieChart,
  ShoppingBag,
  Utensils,
  ShoppingCart,
  Plane,
  Send,
  PlusCircle,
  HelpCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
  TrendingUp,
  Receipt,
  Percent,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type TimePeriod = 'THIS_WEEK' | 'THIS_MONTH' | 'LAST_3_MONTHS' | 'ALL_TIME';

const CATEGORY_COLORS: Record<string, string> = {
  Shopping: '#4F46E5', // Indigo
  Dining: '#F43F5E', // Rose
  Groceries: '#10B981', // Emerald
  Travel: '#F59E0B', // Amber
  Transfer: '#0284C7', // Sky
  'Top-up': '#8B5CF6', // Purple
  General: '#64748B', // Slate
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Shopping: <ShoppingBag size={17} className="text-indigo-600" />,
  Dining: <Utensils size={17} className="text-rose-500" />,
  Groceries: <ShoppingCart size={17} className="text-emerald-600" />,
  Travel: <Plane size={17} className="text-amber-500" />,
  Transfer: <Send size={17} className="text-sky-600" />,
  'Top-up': <PlusCircle size={17} className="text-purple-600" />,
  General: <HelpCircle size={17} className="text-slate-500" />,
};

export const InsightsPage: React.FC = () => {
  const { transactions } = useBank();
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('THIS_MONTH');

  // Filter transactions by selected time period
  const periodTransactions = useMemo(() => {
    const now = new Date();
    return transactions.filter((tx) => {
      const txDate = new Date(tx.timestamp);
      if (isNaN(txDate.getTime())) return false;

      if (selectedPeriod === 'THIS_WEEK') {
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return txDate >= sevenDaysAgo;
      }
      if (selectedPeriod === 'THIS_MONTH') {
        return (
          txDate.getMonth() === now.getMonth() &&
          txDate.getFullYear() === now.getFullYear()
        );
      }
      if (selectedPeriod === 'LAST_3_MONTHS') {
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        return txDate >= ninetyDaysAgo;
      }
      return true; // ALL_TIME
    });
  }, [transactions, selectedPeriod]);

  // Accurate calculations from available transaction data
  const {
    totalSpent,
    totalReceived,
    netFlow,
    successfulCount,
    failedCount,
    categories,
    averageSpent,
    largestSpend,
  } = useMemo(() => {
    let spent = 0;
    let received = 0;
    let successCount = 0;
    let failCount = 0;
    let maxSpend = 0;

    const categoryMap: Record<string, { amount: number; count: number }> = {};

    for (const tx of periodTransactions) {
      if (tx.status === 'SUCCESS') {
        successCount++;
        if (tx.type === 'SEND') {
          spent += tx.amount;
          if (tx.amount > maxSpend) maxSpend = tx.amount;

          const catName = tx.category || 'General';
          if (!categoryMap[catName]) {
            categoryMap[catName] = { amount: 0, count: 0 };
          }
          categoryMap[catName].amount += tx.amount;
          categoryMap[catName].count += 1;
        } else if (tx.type === 'RECEIVE' || tx.type === 'ADD_MONEY') {
          received += tx.amount;
        }
      } else if (tx.status === 'FAILED') {
        failCount++;
      }
    }

    // Convert categoryMap into structured SpendingCategorySummary array
    const catList: SpendingCategorySummary[] = Object.keys(categoryMap).map((cat) => {
      const catAmount = categoryMap[cat].amount;
      const pct = spent > 0 ? Math.round((catAmount / spent) * 100) : 0;
      return {
        category: cat,
        amount: catAmount,
        percentage: pct,
        color: CATEGORY_COLORS[cat] || '#4F46E5',
        count: categoryMap[cat].count,
      };
    });

    catList.sort((a, b) => b.amount - a.amount);

    return {
      totalSpent: spent,
      totalReceived: received,
      netFlow: received - spent,
      successfulCount: successCount,
      failedCount: failCount,
      categories: catList,
      averageSpent: successCount > 0 && spent > 0 ? spent / (catList.reduce((acc, c) => acc + c.count, 0) || 1) : 0,
      largestSpend: maxSpend,
    };
  }, [periodTransactions]);

  // Monthly trend calculated dynamically from transaction history
  const monthlyTrends = useMemo(() => {
    const months = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
    const now = new Date();
    const result = months.map((m, idx) => {
      const targetMonthIndex = (now.getMonth() - (months.length - 1 - idx) + 12) % 12;

      let monthSpent = 0;
      let monthReceived = 0;

      for (const tx of transactions) {
        if (tx.status === 'SUCCESS') {
          const d = new Date(tx.timestamp);
          if (d.getMonth() === targetMonthIndex) {
            if (tx.type === 'SEND') {
              monthSpent += tx.amount;
            } else if (tx.type === 'RECEIVE' || tx.type === 'ADD_MONEY') {
              monthReceived += tx.amount;
            }
          }
        }
      }

      return {
        month: m,
        spent: monthSpent,
        received: monthReceived,
      };
    });

    return result;
  }, [transactions]);

  const maxMonthlyVal = useMemo(() => {
    let max = 1000;
    for (const m of monthlyTrends) {
      if (m.spent > max) max = m.spent;
      if (m.received > max) max = m.received;
    }
    return max * 1.15; // 15% headroom
  }, [monthlyTrends]);

  const periodLabels: Record<TimePeriod, string> = {
    THIS_WEEK: 'This Week',
    THIS_MONTH: 'This Month',
    LAST_3_MONTHS: 'Past 3 Months',
    ALL_TIME: 'All Time',
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <PieChart size={24} className="text-indigo-600" />
            <span>Spending Insights</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time financial analytics calculated from your verified payment activity
          </p>
        </div>

        {/* Date Filter Tabs */}
        <div className="flex p-1 bg-slate-200/80 rounded-2xl overflow-x-auto">
          {(['THIS_WEEK', 'THIS_MONTH', 'LAST_3_MONTHS', 'ALL_TIME'] as TimePeriod[]).map(
            (period) => (
              <button
                key={period}
                type="button"
                onClick={() => setSelectedPeriod(period)}
                className={`py-1.5 px-3 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
                  selectedPeriod === period
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {periodLabels[period]}
              </button>
            )
          )}
        </div>
      </div>

      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Spent */}
        <Card padding="md" className="space-y-1 bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <ArrowUpRight size={15} className="text-rose-500" />
            Total Outflow (Spent)
          </span>
          <p className="text-2xl font-extrabold text-slate-900 font-mono">
            {formatCurrency(totalSpent)}
          </p>
          <p className="text-[11px] text-slate-400">
            {successfulCount} completed payment{successfulCount === 1 ? '' : 's'}
          </p>
        </Card>

        {/* Total Received */}
        <Card padding="md" className="space-y-1 bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <ArrowDownLeft size={15} className="text-emerald-500" />
            Total Inflow (Received)
          </span>
          <p className="text-2xl font-extrabold text-emerald-600 font-mono">
            {formatCurrency(totalReceived)}
          </p>
          <p className="text-[11px] text-slate-400">Incoming transfers &amp; deposits</p>
        </Card>

        {/* Net Flow */}
        <Card padding="md" className="space-y-1 bg-white border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles size={15} className="text-indigo-500" />
            Net Cash Flow
          </span>
          <p
            className={`text-2xl font-extrabold font-mono ${
              netFlow >= 0 ? 'text-emerald-600' : 'text-slate-900'
            }`}
          >
            {netFlow >= 0 ? `+ ${formatCurrency(netFlow)}` : `- ${formatCurrency(Math.abs(netFlow))}`}
          </p>
          <p className="text-[11px] text-slate-400">
            {netFlow >= 0 ? 'Inflows exceed spending' : 'Expenses exceed inflows'}
          </p>
        </Card>
      </div>

      {/* Auxiliary Metrics Pill */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 bg-white rounded-xl border border-slate-200 text-left">
          <span className="text-slate-400 block text-[10px] uppercase font-bold">
            Average Spend / Tx
          </span>
          <p className="font-mono font-bold text-slate-800 text-sm mt-0.5">
            {formatCurrency(averageSpent)}
          </p>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200 text-left">
          <span className="text-slate-400 block text-[10px] uppercase font-bold">
            Largest Single Payment
          </span>
          <p className="font-mono font-bold text-slate-800 text-sm mt-0.5">
            {formatCurrency(largestSpend)}
          </p>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200 text-left">
          <span className="text-slate-400 block text-[10px] uppercase font-bold">
            Active Period
          </span>
          <p className="font-bold text-slate-800 text-sm mt-0.5">
            {periodLabels[selectedPeriod]}
          </p>
        </div>

        <div className="p-3 bg-white rounded-xl border border-slate-200 text-left">
          <span className="text-slate-400 block text-[10px] uppercase font-bold">
            Failed / Cancelled
          </span>
          <p className="font-mono font-bold text-slate-500 text-sm mt-0.5">
            {failedCount} (Excluded)
          </p>
        </div>
      </div>

      {/* Main Charts & Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category-wise Spending Breakdown */}
        <Card padding="lg" className="space-y-5 bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Spending by Category
              </h2>
              <p className="text-xs text-slate-400">
                Categorized expenses for {periodLabels[selectedPeriod].toLowerCase()}
              </p>
            </div>
            <Badge variant="indigo">
              <Percent size={12} className="mr-1" />
              {categories.length} Categories
            </Badge>
          </div>

          {categories.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Receipt size={22} />
              </div>
              <p className="text-sm font-bold text-slate-700">No Expenses in this Period</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                You haven&apos;t made any outgoing payments in {periodLabels[selectedPeriod].toLowerCase()}.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate('/pay')}
                className="mt-2"
              >
                Send a Payment
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {categories.map((cat) => (
                <div key={cat.category} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <div className="flex items-center gap-2 font-semibold text-slate-800">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
                        {CATEGORY_ICONS[cat.category] || <HelpCircle size={16} />}
                      </div>
                      <span>{cat.category}</span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        ({cat.count} tx)
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-bold text-slate-900">
                        {formatCurrency(cat.amount)}
                      </span>
                      <span className="text-slate-400 text-xs ml-1.5">
                        ({cat.percentage}%)
                      </span>
                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(cat.percentage, 100)}%`,
                        backgroundColor: cat.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Dynamic Monthly Inflow vs Outflow Trend */}
        <Card padding="lg" className="space-y-5 bg-white border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-1.5">
                <TrendingUp size={18} className="text-indigo-600" />
                <span>Monthly Cash Flow Trend</span>
              </h2>
              <p className="text-xs text-slate-400">Comparing outgoing vs incoming transfers</p>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                Spent
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Received
              </span>
            </div>
          </div>

          {/* Bar Chart Visualization */}
          <div className="h-52 flex items-end justify-between gap-3 pt-6 pb-2 px-2 border-b border-slate-100">
            {monthlyTrends.map((m) => {
              const spentPct = Math.min(Math.round((m.spent / maxMonthlyVal) * 100), 100);
              const receivedPct = Math.min(Math.round((m.received / maxMonthlyVal) * 100), 100);

              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex items-end justify-center gap-1.5 h-36">
                    {/* Spent Bar */}
                    <div
                      title={`Spent in ${m.month}: ${formatCurrency(m.spent)}`}
                      className="w-3.5 sm:w-5 bg-indigo-600 rounded-t-md transition-all hover:bg-indigo-700 relative group cursor-pointer"
                      style={{ height: `${Math.max(spentPct, 4)}%` }}
                    />
                    {/* Received Bar */}
                    <div
                      title={`Received in ${m.month}: ${formatCurrency(m.received)}`}
                      className="w-3.5 sm:w-5 bg-emerald-500 rounded-t-md transition-all hover:bg-emerald-600 relative group cursor-pointer"
                      style={{ height: `${Math.max(receivedPct, 4)}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-slate-500">{m.month}</span>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-slate-400 text-center">
            Bar heights represent relative monthly volume calculated from transaction history
          </p>
        </Card>
      </div>
    </div>
  );
};
