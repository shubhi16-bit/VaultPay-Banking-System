import React, { useState } from 'react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Alert } from '../components/common/Alert';
import { formatCurrency, formatDate } from '../utils/formatters';
import { MOCK_SYSTEM_STATS } from '../services/mockData';
import {
  ShieldAlert,
  Users,
  Activity,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Search,
} from 'lucide-react';

const MOCK_ADMIN_USERS = [
  { id: 'usr_001', name: 'Alex Sharma', email: 'alex@vault', role: 'User', bankLinked: true, status: 'ACTIVE', volume: 42500 },
  { id: 'usr_002', name: 'Priya Verma', email: 'priya@vault', role: 'User', bankLinked: true, status: 'ACTIVE', volume: 18200 },
  { id: 'usr_003', name: 'Rohan Mehta', email: 'rohan@vp', role: 'User', bankLinked: false, status: 'PENDING_LINK', volume: 0 },
  { id: 'usr_004', name: 'Security Admin', email: 'admin@vaultpay.internal', role: 'Admin', bankLinked: true, status: 'ACTIVE', volume: 0 },
];

export const AdminPage: React.FC = () => {
  const stats = MOCK_SYSTEM_STATS;
  const [userSearch, setUserSearch] = useState('');
  const [auditFilter, setAuditFilter] = useState<'ALL' | 'INFO' | 'WARNING'>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredUsers = MOCK_ADMIN_USERS.filter((u) =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredLogs = stats.recentAuditLogs.filter((log) =>
    auditFilter === 'ALL' || log.status === auditFilter
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert size={26} className="text-amber-500" />
              <span>VaultPay System Administration</span>
            </h1>
            <Badge variant="warning">Internal Only</Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            System health monitoring, simulated user accounts, and security audit logs
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          leftIcon={<RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />}
          onClick={handleRefresh}
        >
          Refresh Telemetry
        </Button>
      </div>

      {/* Admin Disclaimer Alert */}
      <Alert variant="warning" title="Privileged Administrative Console">
        This console is isolated to platform operators. Live banking operations require validated OAuth 2.0 administrative scopes. Currently running in safe Sandbox Telemetry mode.
      </Alert>

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card padding="md" className="space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Platform Users</span>
            <Users size={18} className="text-indigo-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 font-mono">
            {stats.totalUsers.toLocaleString()}
          </p>
          <p className="text-[11px] text-emerald-600 font-medium">+14 new this week</p>
        </Card>

        <Card padding="md" className="space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Processed Transactions</span>
            <Activity size={18} className="text-indigo-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 font-mono">
            {stats.totalTransactionsCount.toLocaleString()}
          </p>
          <p className="text-[11px] text-slate-400 font-medium">99.8% simulated success rate</p>
        </Card>

        <Card padding="md" className="space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Simulated Volume</span>
            <DollarSign size={18} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 font-mono">
            {formatCurrency(stats.totalVolume)}
          </p>
          <p className="text-[11px] text-slate-400 font-medium">Across all linked simulated banks</p>
        </Card>

        <Card padding="md" className="space-y-1">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">System Status</span>
            <CheckCircle size={18} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-600 font-mono">
            {stats.systemHealth}
          </p>
          <p className="text-[11px] text-slate-400 font-medium">All services operating normally</p>
        </Card>
      </div>

      {/* User Management Section */}
      <Card padding="none" className="overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">Registered Accounts</h2>
            <p className="text-xs text-slate-400">Manage user authorization and bank link state</p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-bold tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Bank Link</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-900">{u.name}</p>
                    <p className="font-mono text-slate-400 text-[11px]">{u.email}</p>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-700">{u.role}</td>
                  <td className="py-3 px-4">
                    <Badge variant={u.bankLinked ? 'success' : 'neutral'} size="sm">
                      {u.bankLinked ? 'Linked' : 'Not Linked'}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={u.status === 'ACTIVE' ? 'success' : 'warning'} size="sm">
                      {u.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => alert(`Simulated audit view for ${u.name}`)}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      Audit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Security Audit Trail */}
      <Card padding="none" className="overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Security Audit Logs</h2>
            <p className="text-xs text-slate-400">Real-time immutable administrative trail</p>
          </div>
          <div className="flex gap-1.5">
            {(['ALL', 'INFO', 'WARNING'] as const).map((filter) => (
              <button
                key={filter}
                type="button"
                onClick={() => setAuditFilter(filter)}
                className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-colors ${
                  auditFilter === filter
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredLogs.map((log) => (
            <div key={log.id} className="p-4 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                {log.status === 'WARNING' ? (
                  <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                ) : (
                  <CheckCircle size={16} className="text-indigo-600 shrink-0" />
                )}
                <div>
                  <span className="font-mono font-bold text-slate-800">{log.action}</span>
                  <span className="text-slate-500 ml-2">{log.target}</span>
                </div>
              </div>
              <span className="text-slate-400 font-mono text-[11px]">
                {formatDate(log.timestamp)}
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
