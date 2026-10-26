import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Logo } from '../components/common/Logo';
import { Card } from '../components/common/Card';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Alert } from '../components/common/Alert';
import { User, Mail, Lock, Phone, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  // Compute live preview of assigned VaultPay ID
  const suggestedVpa = email.trim()
    ? `${email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '') || 'username'}@vault`
    : name.trim()
    ? `${name.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '') || 'username'}@vault`
    : 'yourname@vault';

  // Password strength calculation
  const getPasswordStrength = () => {
    if (!password) return { label: 'Empty', score: 0, color: 'bg-slate-200' };
    if (password.length < 6) return { label: 'Too short', score: 25, color: 'bg-rose-500' };
    let score = 50;
    if (/[0-9]/.test(password)) score += 25;
    if (/[^A-Za-z0-9]/.test(password) || /[A-Z]/.test(password)) score += 25;

    if (score >= 100) return { label: 'Strong', score: 100, color: 'bg-emerald-500' };
    if (score >= 75) return { label: 'Good', score: 75, color: 'bg-sky-500' };
    return { label: 'Fair', score: 50, color: 'bg-amber-500' };
  };

  const strength = getPasswordStrength();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please ensure both passwords match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (!agreeTerms) {
      setError('You must accept the simulated sandbox terms to proceed.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await register(name, email, password, phone);
      if (result.success && result.redirectTo) {
        navigate(result.redirectTo);
      } else {
        setError(result.error || 'Failed to create your account.');
      }
    } catch {
      setError('An unexpected error occurred during registration.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-3">
          <Logo size="lg" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Create Your VaultPay Account
        </h1>
        <p className="mt-1.5 text-xs sm:text-sm text-slate-500">
          Sign up to get your unique VaultPay ID and connect simulated banks
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md">
        <Card padding="lg" className="shadow-elevated border border-slate-200/80 space-y-5">
          {/* Live VaultPay ID preview card */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-50 via-white to-indigo-50 border border-indigo-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1">
                <Sparkles size={12} />
                <span>Your Reserved VaultPay ID</span>
              </p>
              <p className="font-mono text-sm font-bold text-slate-900 mt-0.5">
                {suggestedVpa}
              </p>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 size={12} />
              Available
            </span>
          </div>

          {error && (
            <Alert variant="danger" title="Registration Notice">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit} method="POST" className="space-y-4">
            <Input
              id="regName"
              name="name"
              label="Full Name"
              placeholder="e.g. Samir Khan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              leftIcon={<User size={18} />}
              required
              autoComplete="name"
            />

            <Input
              id="regEmail"
              name="email"
              type="email"
              label="Email Address"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail size={18} />}
              required
              autoComplete="email"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />

            <Input
              id="regPhone"
              name="phone"
              type="tel"
              label="Mobile Number (Optional)"
              placeholder="+91 98765 00000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              leftIcon={<Phone size={18} />}
              autoComplete="tel"
              inputMode="tel"
            />

            <div className="space-y-1">
              <Input
                id="regPassword"
                name="password"
                type="password"
                label="Create Password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock size={18} />}
                required
                autoComplete="new-password"
              />

              {/* Password strength visual meter */}
              {password && (
                <div className="pt-1.5 space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Strength:</span>
                    <span className="font-semibold text-slate-700">{strength.label}</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${strength.color}`}
                      style={{ width: `${strength.score}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <Input
              id="regConfirmPassword"
              name="confirmPassword"
              type="password"
              label="Confirm Password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              leftIcon={<Lock size={18} />}
              required
              autoComplete="new-password"
              error={
                confirmPassword && password !== confirmPassword
                  ? 'Passwords do not match'
                  : undefined
              }
            />

            <label className="flex items-start gap-2.5 pt-1 text-xs cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
              />
              <span className="text-slate-600 leading-normal">
                I understand this is a <strong>simulated sandbox</strong> environment. No real funds or real bank credentials are used.
              </span>
            </label>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
              isLoading={isLoading}
              rightIcon={<ArrowRight size={18} />}
              className="mt-2"
            >
              Continue to Bank Linking
            </Button>
          </form>

          <div className="pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Already registered?{' '}
              <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-700">
                Sign in to your account
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
