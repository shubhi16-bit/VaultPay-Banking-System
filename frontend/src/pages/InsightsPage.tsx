import React from 'react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { formatCurrency } from '../utils/formatters';
import { MOCK_SPENDING_INSIGHTS } from '../services/mockData';
import {
  PieChart,
  ShoppingBag,
  Utensils,
  ShoppingCart,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';

export const InsightsPage: React.FC = () => {
  const insights = MOCK_SPENDING_INSIGHTS;

  const categoryIcons: Record<string, React.ReactNode> = {
    Shopping: <ShoppingBag size={18} className="text-indigo-600" />,
    Dining: <Utensils size={18} className="text-sky-600" />,
    Groceries: <ShoppingCart size={18} className="text-emerald-600" />,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <PieChart size={24} className="text-indigo-600" />
            <span>Spending Insights</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Intelligent analysis of your simulated payments and budget distribution
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="indigo">
            <Calendar size={13} className="mr-1" />
            October 2026
          </Badge>
          <Badge variant="warning">Simulated Sandbox</Badge>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding="md" className="space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <ArrowUpRight size={15} className="text-rose-500" />
            Total Spent this Month
          </span>
          <p className="text-2xl font-extrabold text-slate-900 font-mono">
            {formatCurrency(insights.totalSpentThisMonth)}
          </p>
          <p className="text-[11px] text-slate-400">Across {insights.transactionCount} transactions</p>
        </Card>

        <Card padding="md" className="space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <ArrowDownLeft size={15} className="text-emerald-500" />
            Total Received
          </span>
          <p className="text-2xl font-extrabold text-emerald-600 font-mono">
            {formatCurrency(insights.totalReceivedThisMonth)}
          </p>
          <p className="text-[11px] text-slate-400">Transfers & top-ups</p>
        </Card>

        <Card padding="md" className="space-y-1">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles size={15} className="text-indigo-500" />
            Net Monthly Flow
          </span>
          <p className="text-2xl font-extrabold text-slate-900 font-mono">
            - {formatCurrency(insights.totalSpentThisMonth - insights.totalReceivedThisMonth)}
          </p>
          <p className="text-[11px] text-slate-400">Expenses exceeded inflows</p>
        </Card>
      </div>

      {/* Main Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <Card padding="lg" className="space-y-5">
          <h2 className="text-base sm:text-lg font-bold text-slate-900">
            Spending by Category
          </h2>

          <div className="space-y-4">
            {insights.categories.map((cat) => (
              <div key={cat.category} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center gap-2 font-semibold text-slate-800">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center">
                      {categoryIcons[cat.category] || <ShoppingBag size={16} />}
                    </div>
                    <span>{cat.category}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-slate-900">{formatCurrency(cat.amount)}</span>
                    <span className="text-slate-400 text-xs ml-1.5">({cat.percentage}%)</span>
                  </div>
                </div>

                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${cat.percentage}%`,
                      backgroundColor: cat.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* 5-Month Trend Bar Chart */}
        <Card padding="lg" className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              5-Month Spending Trend
            </h2>
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

          <div className="h-48 flex items-end justify-between gap-3 pt-6 pb-2 px-2 border-b border-slate-100">
            {insights.monthlyTrend.map((m) => {
              const maxVal = 8500;
              const spentHeight = Math.round((m.spent / maxVal) * 100);
              const receivedHeight = Math.round((m.received / maxVal) * 100);

              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex items-end justify-center gap-1.5 h-36">
                    <div
                      title={`Spent: ₹${m.spent}`}
                      className="w-4 sm:w-5 bg-indigo-600 rounded-t-md transition-all hover:bg-indigo-700"
                      style={{ height: `${spentHeight}%` }}
                    />
                    <div
                      title={`Received: ₹${m.received}`}
                      className="w-4 sm:w-5 bg-emerald-500 rounded-t-md transition-all hover:bg-emerald-600"
                      style={{ height: `${receivedHeight}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-slate-500">{m.month}</span>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-400 text-center">
            Bar heights represent relative monthly volume in INR
          </p>
        </Card>
      </div>
    </div>
  );
};
