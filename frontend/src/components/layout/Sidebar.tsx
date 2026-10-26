import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Send,
  QrCode,
  PlusCircle,
  History,
  Landmark,
  PieChart,
  User,
  Settings,
  ShieldAlert,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { isAdmin } = useAuth();

  const navItems = [
    { label: 'Home', path: '/', icon: LayoutDashboard },
    { label: 'Pay People', path: '/pay', icon: Send },
    { label: 'Scan & Pay', path: '/qr', icon: QrCode },
    { label: 'Add Money', path: '/add-money', icon: PlusCircle },
    { label: 'Transactions', path: '/transactions', icon: History },
    { label: 'Bank Accounts', path: '/accounts', icon: Landmark },
    { label: 'Spending Insights', path: '/insights', icon: PieChart },
    { label: 'My Profile', path: '/profile', icon: User },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r border-slate-200/80 bg-white min-h-[calc(100vh-61px)] py-6 px-4 shrink-0">
      <div className="space-y-1">
        <p className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
          Payments & Banking
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={19}
                    className={isActive ? 'text-indigo-600 stroke-[2.3]' : 'text-slate-400 stroke-[1.8]'}
                  />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>

      {isAdmin && (
        <div className="mt-8 pt-4 border-t border-slate-100 space-y-1">
          <p className="px-3 text-[11px] font-bold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <ShieldAlert size={13} />
            <span>Management</span>
          </p>
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-700 hover:bg-slate-100'
              }`
            }
          >
            <ShieldAlert size={19} className="text-amber-400" />
            <span>Admin Console</span>
          </NavLink>
        </div>
      )}

      {/* Safety notice in sidebar */}
      <div className="mt-auto pt-6 px-3">
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70 text-[11px] text-slate-500 space-y-1">
          <p className="font-semibold text-slate-700 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            VaultPay Protected
          </p>
          <p className="leading-relaxed">
            All simulated transactions are protected by simulated 256-bit encryption.
          </p>
        </div>
      </div>
    </aside>
  );
};
