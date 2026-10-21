import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Alert } from '../components/common/Alert';
import { Modal } from '../components/common/Modal';
import { getInitials } from '../utils/formatters';
import {
  User as UserIcon,
  Shield,
  Key,
  Bell,
  LogOut,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinSuccess, setPinSuccess] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [biometricsEnabled, setBiometricsEnabled] = useState(true);

  const handlePinChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length >= 4) {
      setPinSuccess(true);
      setCurrentPin('');
      setNewPin('');
      setTimeout(() => setPinSuccess(false), 3000);
    }
  };

  const handleConfirmLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <UserIcon size={24} className="text-indigo-600" />
          <span>Profile & Account Settings</span>
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Manage your personal details, simulated security PIN, and preferences
        </p>
      </div>

      {/* User Information Card */}
      <Card padding="lg" className="shadow-sm">
        <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 rounded-3xl bg-indigo-600 text-white font-extrabold text-xl flex items-center justify-center shadow-md shadow-indigo-500/20">
            {getInitials(user?.name || 'VaultPay')}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{user?.name}</h2>
            <p className="text-xs font-mono text-indigo-600 font-semibold">{user?.vaultPayId}</p>
            <p className="text-xs text-slate-400 mt-0.5">{user?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 text-xs">
          <div>
            <span className="text-slate-400">Account Type</span>
            <p className="font-semibold text-slate-800 capitalize mt-0.5">{user?.role} Account</p>
          </div>
          <div>
            <span className="text-slate-400">Mobile Phone</span>
            <p className="font-semibold text-slate-800 mt-0.5">{user?.phone || '+91 98765 43210'}</p>
          </div>
          <div>
            <span className="text-slate-400">Member Since</span>
            <p className="font-semibold text-slate-800 mt-0.5">January 2026</p>
          </div>
          <div>
            <span className="text-slate-400">Security Status</span>
            <p className="font-semibold text-emerald-600 flex items-center gap-1 mt-0.5">
              <Shield size={13} />
              Simulated PIN Protected
            </p>
          </div>
        </div>
      </Card>

      {/* Security & PIN Settings */}
      <Card padding="lg" className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Key size={18} className="text-indigo-600" />
          <span>Security & UPI PIN</span>
        </h2>

        {pinSuccess && (
          <Alert variant="success" icon={false}>
            <span className="flex items-center gap-2 font-medium">
              <CheckCircle2 size={16} />
              Simulated Security PIN successfully updated!
            </span>
          </Alert>
        )}

        <form onSubmit={handlePinChange} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              id="currPin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              label="Current PIN"
              placeholder="••••"
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value)}
              required
            />
            <Input
              id="newPin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              label="New 4-Digit PIN"
              placeholder="••••"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              required
            />
          </div>

          <Button type="submit" variant="outline" size="sm">
            Update Security PIN
          </Button>
        </form>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-800">Simulate Biometric Unlock</p>
            <p className="text-[11px] text-slate-400">Require touch or face verification before opening the app</p>
          </div>
          <button
            type="button"
            onClick={() => setBiometricsEnabled(!biometricsEnabled)}
            className={`w-11 h-6 rounded-full transition-colors p-0.5 ${
              biometricsEnabled ? 'bg-indigo-600' : 'bg-slate-200'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                biometricsEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </Card>

      {/* Preferences & Notifications */}
      <Card padding="lg" className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Bell size={18} className="text-indigo-600" />
          <span>Notification Preferences</span>
        </h2>

        <div className="flex items-center justify-between text-xs">
          <div>
            <p className="font-bold text-slate-800">Instant Payment Alerts</p>
            <p className="text-slate-400">Receive simulated notifications when money is sent or received</p>
          </div>
          <button
            type="button"
            onClick={() => setNotificationsEnabled(!notificationsEnabled)}
            className={`w-11 h-6 rounded-full transition-colors p-0.5 ${
              notificationsEnabled ? 'bg-indigo-600' : 'bg-slate-200'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </Card>

      {/* Danger Zone / Sign Out */}
      <Card padding="md" className="border-rose-100 bg-rose-50/20 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-900">Sign Out of VaultPay</p>
          <p className="text-[11px] text-slate-500">Safely terminate your current session on this device</p>
        </div>
        <Button
          variant="danger"
          size="sm"
          leftIcon={<LogOut size={15} />}
          onClick={() => setIsLogoutModalOpen(true)}
        >
          Sign Out
        </Button>
      </Card>

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={isLogoutModalOpen}
        onClose={() => setIsLogoutModalOpen(false)}
        title="Confirm Sign Out"
      >
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <Lock size={22} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Are you sure you want to sign out?</h3>
            <p className="text-xs text-slate-500 mt-1">
              You will need to enter your VaultPay credentials to access your dashboard again.
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" fullWidth onClick={() => setIsLogoutModalOpen(false)}>
              Stay Signed In
            </Button>
            <Button variant="danger" fullWidth onClick={handleConfirmLogout}>
              Confirm Sign Out
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
