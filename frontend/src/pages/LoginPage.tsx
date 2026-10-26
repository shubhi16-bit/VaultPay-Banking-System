import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/common/Logo';
import { Card } from '../components/common/Card';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Alert } from '../components/common/Alert';
import { Badge } from '../components/common/Badge';
import { Mail, Lock, ShieldCheck, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('alex@vault');
  const [password, setPassword] = useState('password123');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { login, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isExpired = new URLSearchParams(location.search).get('expired') === 'true';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const result = await login(identifier, password, isAdminMode);
      if (result.success && result.redirectTo) {
        navigate(result.redirectTo);
      } else {
        setError(result.error || 'Authentication failed. Please check your credentials.');
      }
    } catch {
      setError('An unexpected error occurred during login.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick preset helper
  const applyPreset = (type: 'linked' | 'unlinked' | 'admin') => {
    setError(null);
    if (type === 'linked') {
      setIdentifier('alex@vault');
      setPassword('password123');
      setIsAdminMode(false);
    } else if (type === 'unlinked') {
      setIdentifier('samir@vault');
      setPassword('password123');
      setIsAdminMode(false);
    } else {
      setIdentifier('admin@vaultpay.internal');
      setPassword('password123');
      setIsAdminMode(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      {/* Top Branding */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-3">
          <Logo size="lg" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Welcome Back to VaultPay
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm text-slate-500">
          Fast, simple, and secure digital payments
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md">
        {/* Returning user notice if session already exists */}
        {isAuthenticated && user && (
          <div className="mb-4 p-3.5 bg-indigo-50 border border-indigo-200/80 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                {user.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Signed in as {user.name}</p>
                <p className="text-[11px] text-slate-500 font-mono">{user.vaultPayId}</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={() => navigate(user.role === 'admin' ? '/admin' : user.isBankLinked ? '/' : '/onboarding')}
            >
              Go to App
            </Button>
          </div>
        )}

        <Card padding="lg" className="shadow-elevated border border-slate-200/80">
          {isExpired && (
            <Alert variant="warning" title="Session Timed Out" className="mb-5">
              Your previous session expired for security. Please sign in again.
            </Alert>
          )}

          {error && (
            <Alert variant="danger" title="Sign In Error" className="mb-5">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} method="POST" className="space-y-4">
            <Input
              id="loginIdentifier"
              name="identifier"
              label="Email or VaultPay ID"
              placeholder="e.g. alex@vault or user@example.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              leftIcon={<Mail size={18} />}
              required
              autoComplete="username"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />

            <Input
              id="loginPassword"
              name="password"
              type="password"
              label="Password"
              placeholder="Enter your account password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock size={18} />}
              required
              autoComplete="current-password"
            />

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isAdminMode}
                  onChange={(e) => {
                    setIsAdminMode(e.target.checked);
                    if (e.target.checked) {
                      setIdentifier('admin@vaultpay.internal');
                    } else if (identifier.includes('admin')) {
                      setIdentifier('alex@vault');
                    }
                  }}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-slate-700 font-medium">Log in as System Admin</span>
              </label>

              <span className="text-indigo-600 hover:text-indigo-800 cursor-pointer font-medium">
                Forgot password?
              </span>
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
              isLoading={isLoading}
              rightIcon={<ArrowRight size={18} />}
              className="mt-2"
            >
              Sign In to Account
            </Button>
          </form>

          {/* Quick preset selector chips */}
          <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Quick Test Personas
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => applyPreset('linked')}
                className={`p-2 rounded-xl border text-[11px] font-semibold text-center transition-all ${
                  identifier === 'alex@vault' && !isAdminMode
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Alex (Linked)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('unlinked')}
                className={`p-2 rounded-xl border text-[11px] font-semibold text-center transition-all ${
                  identifier === 'samir@vault' && !isAdminMode
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Samir (New)
              </button>
              <button
                type="button"
                onClick={() => applyPreset('admin')}
                className={`p-2 rounded-xl border text-[11px] font-semibold text-center transition-all ${
                  isAdminMode
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Admin
              </button>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              New to VaultPay?{' '}
              <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-700">
                Create a free account
              </Link>
            </p>
          </div>
        </Card>

        {/* Security / sandbox hint */}
        <div className="mt-5 p-3.5 rounded-2xl bg-slate-100/80 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-indigo-600 shrink-0" />
            <span>Simulated Banking Sandbox</span>
          </div>
          <Badge variant="indigo" size="sm">v1.0-Phase2</Badge>
        </div>
      </div>
    </div>
  );
};
