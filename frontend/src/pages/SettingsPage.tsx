import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBank } from '../context/BankContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { Alert } from '../components/common/Alert';
import { Modal } from '../components/common/Modal';
import {
  Settings,
  Key,
  Bell,
  LogOut,
  RotateCcw,
  CheckCircle2,
  Lock,
  ArrowLeft,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { logout } = useAuth();
  const { primaryAccount, isBackendOnline, refreshBalances } = useBank();
  const navigate = useNavigate();

  // Security PIN states
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinSuccess, setPinSuccess] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  // Preference Toggles
  const [twoFactorSimulated, setTwoFactorSimulated] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);

  // Modals
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleUpdatePin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);

    if (newPin.length < 4 || newPin.length > 6) {
      setPinError('New PIN must be 4 or 6 digits.');
      return;
    }

    if (newPin !== confirmPin) {
      setPinError('New PIN and confirmation PIN do not match.');
      return;
    }

    // Save in localStorage for demo simulation
    localStorage.setItem('vaultpay_simulated_pin', newPin);
    setPinSuccess(true);
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setTimeout(() => setPinSuccess(false), 4000);
  };

  const handleResetSandboxData = () => {
    localStorage.removeItem('vaultpay_banks');
    localStorage.removeItem('vaultpay_transactions');
    localStorage.removeItem('vaultpay_wallet');
    refreshBalances();
    setIsResetModalOpen(false);
    setResetSuccess(true);
    setTimeout(() => {
      setResetSuccess(false);
      window.location.reload();
    }, 1200);
  };

  const handleConfirmLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header with Back Navigation */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors mb-1"
          >
            <ArrowLeft size={15} />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Settings size={24} className="text-indigo-600" />
            <span>Settings &amp; Preferences</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage your payment security, preferences, and account controls
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <Badge variant={isBackendOnline ? 'success' : 'warning'} dot>
            {isBackendOnline ? 'Live Backend Connected' : 'Sandbox Mode Active'}
          </Badge>
        </div>
      </div>

      {resetSuccess && (
        <Alert variant="success" title="Sandbox Reset Complete">
          Local test transactions and bank balances have been restored to initial defaults. Reloading...
        </Alert>
      )}

      {/* Account Preferences Card */}
      <Card padding="lg" className="bg-white border border-slate-200 shadow-sm space-y-4 text-left">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Payment Preferences
        </h2>

        {/* Default Bank Account */}
        <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-slate-900">Default Payment Source</p>
            <p className="text-xs text-slate-500">
              {primaryAccount
                ? `${primaryAccount.bankName} (${primaryAccount.maskedAccountNumber})`
                : 'No bank linked'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/accounts')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
          >
            <span>Change</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Currency & Locale */}
        <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
          <div>
            <p className="font-bold text-slate-900">Operating Currency</p>
            <p className="text-slate-500">Standard VaultPay denomination</p>
          </div>
          <span className="font-mono font-bold text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
            INR (₹)
          </span>
        </div>
      </Card>

      {/* Security & Simulated UPI PIN Card */}
      <Card padding="lg" className="bg-white border border-slate-200 shadow-sm space-y-4 text-left">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Key size={16} className="text-indigo-600" />
            <span>Security &amp; Simulated UPI PIN</span>
          </h2>
          <span className="text-[11px] font-semibold text-slate-400">Sandbox Security</span>
        </div>

        {pinSuccess && (
          <Alert variant="success" icon={false}>
            <span className="flex items-center gap-2 font-medium text-xs">
              <CheckCircle2 size={16} />
              Simulated security PIN successfully updated!
            </span>
          </Alert>
        )}

        {pinError && <Alert variant="danger">{pinError}</Alert>}

        <form onSubmit={handleUpdatePin} className="space-y-3 pt-1">
          <Input
            id="currentPin"
            name="currentPin"
            type="password"
            inputMode="numeric"
            maxLength={6}
            label="Current PIN"
            placeholder="••••"
            value={currentPin}
            onChange={(e) => setCurrentPin(e.target.value.replace(/[^0-9]/g, ''))}
            required
            helperText="Default sandbox PIN: 1234"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              id="newPin"
              name="newPin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              label="New 4 or 6-Digit PIN"
              placeholder="••••"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
              required
            />
            <Input
              id="confirmPin"
              name="confirmPin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              label="Confirm New PIN"
              placeholder="••••"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/[^0-9]/g, ''))}
              required
            />
          </div>

          <Button type="submit" variant="primary" size="sm">
            Save New Security PIN
          </Button>
        </form>

        {/* 2FA Toggle */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-800">Simulate 2-Factor Authentication</p>
            <p className="text-[11px] text-slate-400">
              Require PIN confirmation on payments and login
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTwoFactorSimulated(!twoFactorSimulated)}
            className={`w-11 h-6 rounded-full transition-colors p-0.5 ${
              twoFactorSimulated ? 'bg-indigo-600' : 'bg-slate-200'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform ${
                twoFactorSimulated ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </Card>

      {/* Notifications Preferences */}
      <Card padding="lg" className="bg-white border border-slate-200 shadow-sm space-y-4 text-left">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Bell size={16} className="text-indigo-600" />
          <span>Notification Preferences</span>
        </h2>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div>
              <p className="font-bold text-slate-800">Email Payment Receipts</p>
              <p className="text-slate-400">Send simulated email vouchers after each transaction</p>
            </div>
            <button
              type="button"
              onClick={() => setEmailAlerts(!emailAlerts)}
              className={`w-11 h-6 rounded-full transition-colors p-0.5 ${
                emailAlerts ? 'bg-indigo-600' : 'bg-slate-200'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  emailAlerts ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between text-xs pt-3 border-t border-slate-100">
            <div>
              <div className="flex items-center gap-1.5">
                <p className="font-bold text-slate-800">SMS Instant Alerts</p>
                <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-semibold">
                  Gateway Integration Pending
                </span>
              </div>
              <p className="text-slate-400">Requires SMS telecommunications provider integration in backend</p>
            </div>
            <button
              type="button"
              onClick={() => setSmsAlerts(!smsAlerts)}
              className={`w-11 h-6 rounded-full transition-colors p-0.5 ${
                smsAlerts ? 'bg-indigo-600' : 'bg-slate-200'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform ${
                  smsAlerts ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </Card>

      {/* Consequential Actions / Account Management */}
      <Card padding="lg" className="border-rose-100 bg-rose-50/20 space-y-4 text-left">
        <h2 className="text-sm font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
          <AlertTriangle size={16} />
          <span>Account Controls &amp; Data Reset</span>
        </h2>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div>
            <p className="text-xs font-bold text-slate-900">Reset Local Sandbox Data</p>
            <p className="text-[11px] text-slate-500">
              Clears local transaction records and restores initial demo bank balances
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsResetModalOpen(true)}
            leftIcon={<RotateCcw size={14} />}
            className="border-slate-300 text-slate-700 hover:bg-slate-100 shrink-0"
          >
            Reset Sandbox
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-rose-100">
          <div>
            <p className="text-xs font-bold text-slate-900">Sign Out of VaultPay</p>
            <p className="text-[11px] text-slate-500">
              Terminate active authentication token on this device
            </p>
          </div>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setIsLogoutModalOpen(true)}
            leftIcon={<LogOut size={14} />}
            className="shrink-0"
          >
            Sign Out
          </Button>
        </div>
      </Card>

      {/* Reset Confirmation Modal */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        title="Reset Local Sandbox Data?"
      >
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
            <RotateCcw size={22} />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Reset Sandbox Transactions?</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              This will clear newly created local transfers and reset your simulated bank balances back to default demo data.
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" fullWidth onClick={() => setIsResetModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" fullWidth onClick={handleResetSandboxData}>
              Confirm Reset
            </Button>
          </div>
        </div>
      </Modal>

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
            <h3 className="text-base font-bold text-slate-900">Sign out of your account?</h3>
            <p className="text-xs text-slate-500 mt-1">
              You will need to sign in again to access your VaultPay account.
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

