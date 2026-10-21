import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useBank } from '../../context/BankContext';
import { Logo } from '../common/Logo';
import { formatCurrency, getInitials } from '../../utils/formatters';
import { LogOut, User as UserIcon, ShieldAlert, CreditCard, ChevronDown } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const { walletBalance } = useBank();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo (Mobile & Desktop) */}
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 rounded-lg">
            <Logo size="sm" />
          </Link>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Wallet Balance Pill */}
          <Link
            to="/add-money"
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50 transition-colors text-xs sm:text-sm font-medium text-slate-800"
            title="VaultPay Available Wallet Balance"
          >
            <CreditCard size={15} className="text-indigo-600" />
            <span className="text-slate-500 hidden md:inline">Balance:</span>
            <span className="font-semibold text-slate-900">{formatCurrency(walletBalance)}</span>
          </Link>

          {/* Admin badge link if admin */}
          {isAdmin && (
            <Link
              to="/admin"
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-900 text-white hover:bg-slate-800 transition-colors"
            >
              <ShieldAlert size={13} className="text-amber-400" />
              <span>Admin Console</span>
            </Link>
          )}

          {/* User profile menu */}
          {user && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-expanded={dropdownOpen}
                aria-haspopup="true"
                aria-label="User menu"
                className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-full hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 border border-transparent hover:border-slate-200"
              >
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-semibold text-xs flex items-center justify-center shadow-sm">
                  {getInitials(user.name)}
                </div>
                <span className="hidden sm:block text-xs font-semibold text-slate-800 max-w-[120px] truncate">
                  {user.name}
                </span>
                <ChevronDown size={14} className="text-slate-400 hidden sm:block" />
              </button>

              {/* Profile Dropdown */}
              {dropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setDropdownOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
                      <p className="text-[11px] text-slate-500 truncate font-mono">{user.vaultPayId}</p>
                    </div>

                    <div className="py-1">
                      <Link
                        to="/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600"
                      >
                        <UserIcon size={15} />
                        <span>Profile & Settings</span>
                      </Link>

                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600"
                        >
                          <ShieldAlert size={15} className="text-amber-500" />
                          <span>Admin Dashboard</span>
                        </Link>
                      )}
                    </div>

                    <div className="border-t border-slate-100 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setDropdownOpen(false);
                          handleLogout();
                        }}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50"
                      >
                        <LogOut size={15} />
                        <span>Sign out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
