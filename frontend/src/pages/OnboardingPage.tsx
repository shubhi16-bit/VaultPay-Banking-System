import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBank } from '../context/BankContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Alert } from '../components/common/Alert';
import { Badge } from '../components/common/Badge';
import { Logo } from '../components/common/Logo';
import { SIMULATED_PARTNER_BANKS, type SimulatedPartnerBank } from '../services/mockData';
import {
  Landmark,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  CreditCard,
  Copy,
  Check,
  Building2,
  Lock,
  ArrowLeft,
} from 'lucide-react';

export const OnboardingPage: React.FC = () => {
  const { user, markBankAsLinked } = useAuth();
  const { bankAccounts, primaryAccount, linkNewBankAccount } = useBank();
  const navigate = useNavigate();

  // If user is already linked when they visit, allow them to manage or proceed directly
  const alreadyLinked = user?.isBankLinked && bankAccounts.length > 0;

  const [step, setStep] = useState<1 | 2 | 3 | 4>(alreadyLinked ? 1 : 1);
  const [selectedBank, setSelectedBank] = useState<SimulatedPartnerBank>(SIMULATED_PARTNER_BANKS[0]);
  const [accountNumber, setAccountNumber] = useState('5010082910394');
  const [ifscCode, setIfscCode] = useState(SIMULATED_PARTNER_BANKS[0].ifscPrefix);
  const [accountType, setAccountType] = useState<'Savings' | 'Current'>('Savings');
  const [securityPin, setSecurityPin] = useState('1234');
  const [confirmPin, setConfirmPin] = useState('1234');
  const [copiedVpa, setCopiedVpa] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Animated handshake state
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [verificationStatusText, setVerificationStatusText] = useState('');

  // Handle bank selection
  const handleSelectBank = (bank: SimulatedPartnerBank) => {
    setSelectedBank(bank);
    setIfscCode(bank.ifscPrefix);
  };

  const handleCopyVpa = () => {
    if (user?.vaultPayId) {
      navigator.clipboard.writeText(user.vaultPayId);
      setCopiedVpa(true);
      setTimeout(() => setCopiedVpa(false), 2000);
    }
  };

  // Start animated handshake and link account
  const handleStartLinking = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanAcc = accountNumber.replace(/\s+/g, '');
    if (cleanAcc.length < 8) {
      setError('Simulated account number must be at least 8 digits.');
      return;
    }

    if (!securityPin || securityPin.length < 4) {
      setError('Please choose a 4 or 6-digit security PIN.');
      return;
    }

    if (securityPin !== confirmPin) {
      setError('PINs do not match. Please re-enter.');
      return;
    }

    // Trigger animated verification screen (Step 3)
    setStep(3);
    setVerificationProgress(20);
    setVerificationStatusText(`Connecting to ${selectedBank.name} digital clearing gateway...`);

    // Simulated progress steps
    setTimeout(() => {
      setVerificationProgress(55);
      setVerificationStatusText('Verifying account mandate and establishing simulated UPI credentials...');
    }, 900);

    setTimeout(() => {
      setVerificationProgress(85);
      setVerificationStatusText('Provisioning ₹25,000.00 simulated sandbox starting balance...');
    }, 1800);

    setTimeout(async () => {
      try {
        const result = await linkNewBankAccount({
          bankName: selectedBank.name,
          accountNumber: cleanAcc,
          ifscCode,
          accountType,
          initialDeposit: 25000.00,
        });

        if (result.success) {
          markBankAsLinked();
          setVerificationProgress(100);
          setStep(4); // Celebration step
        } else {
          setStep(2);
          setError(result.error || 'Failed to link simulated bank account.');
        }
      } catch {
        setStep(2);
        setError('A network error occurred while contacting the simulated bank.');
      }
    }, 2600);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 px-4 sm:px-6">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        {/* Header branding */}
        <div className="flex justify-center mb-4">
          <Logo size="md" />
        </div>

        {/* Sensible Returning User Notice */}
        {alreadyLinked && primaryAccount && (
          <div className="mb-6 p-4 rounded-2xl bg-white border border-indigo-200/80 shadow-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 size={22} />
              </div>
              <div className="text-left text-xs">
                <p className="font-bold text-slate-900">You already have a linked account</p>
                <p className="text-slate-500 font-medium">
                  {primaryAccount.bankName} ({primaryAccount.maskedAccountNumber})
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link to="/">
                <Button variant="primary" size="sm">
                  Return to Dashboard
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Progress Tracker (Steps 1 to 4) */}
        <nav aria-label="Onboarding Progress Tracker" className="mb-6">
          <ol className="flex items-center justify-between max-w-sm mx-auto text-xs font-semibold">
            <li className={`flex items-center gap-1.5 ${step >= 1 ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors ${
                step >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                1
              </span>
              <span>VaultPay ID</span>
            </li>
            <div className={`h-0.5 w-8 transition-colors ${step >= 2 ? 'bg-indigo-600' : 'bg-slate-200'}`} />
            <li className={`flex items-center gap-1.5 ${step >= 2 ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors ${
                step >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                2
              </span>
              <span>Link Bank</span>
            </li>
            <div className={`h-0.5 w-8 transition-colors ${step >= 3 ? 'bg-indigo-600' : 'bg-slate-200'}`} />
            <li className={`flex items-center gap-1.5 ${step >= 3 ? 'text-indigo-600 font-bold' : 'text-slate-400'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors ${
                step >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                3
              </span>
              <span>Verify</span>
            </li>
            <div className={`h-0.5 w-8 transition-colors ${step === 4 ? 'bg-emerald-600' : 'bg-slate-200'}`} />
            <li className={`flex items-center gap-1.5 ${step === 4 ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors ${
                step === 4 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}>
                4
              </span>
              <span>Ready</span>
            </li>
          </ol>
        </nav>

        {/* STEP 1: VaultPay ID Welcome & Confirmation */}
        {step === 1 && (
          <Card padding="lg" className="shadow-elevated text-center space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-sm">
              <Sparkles size={32} />
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                Account Activation
              </span>
              <h1 className="text-2xl font-bold text-slate-900">
                Welcome, {user?.name || 'VaultPay User'}!
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                Your personal simulated payment handle is ready. People can use this ID to pay you without needing your bank account number.
              </p>
            </div>

            {/* ID Display Box */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between max-w-sm mx-auto">
              <div className="text-left font-mono">
                <span className="text-[10px] text-slate-400 uppercase font-sans font-bold block">
                  Your VaultPay ID
                </span>
                <span className="text-base font-bold text-indigo-950">
                  {user?.vaultPayId || 'user@vault'}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyVpa}
                aria-label="Copy VaultPay ID"
                className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-xl transition-all"
                title="Copy to clipboard"
              >
                {copiedVpa ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
              </button>
            </div>

            {/* Feature highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-2">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                <p className="text-xs font-bold text-slate-800">Direct Pay</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Send funds instantly via any `@vault` or `@vp` ID.</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                <p className="text-xs font-bold text-slate-800">QR Code</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Generate your personal QR code for quick payments.</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                <p className="text-xs font-bold text-slate-800">Sandbox Balance</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Get simulated funds provisioned on linking.</p>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => setStep(2)}
              rightIcon={<ArrowRight size={18} />}
            >
              Continue to Choose Bank
            </Button>
          </Card>
        )}

        {/* STEP 2: Partner Bank Selection & Account Form */}
        {step === 2 && (
          <Card padding="lg" className="shadow-elevated space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Landmark size={22} className="text-indigo-600" />
                  <span>Select Partner Bank</span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pick a fictional banking institution to link your simulated funds
                </p>
              </div>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold"
              >
                <ArrowLeft size={14} /> Back
              </button>
            </div>

            {error && (
              <Alert variant="danger" title="Bank Linking Error">
                {error}
              </Alert>
            )}

            {/* Fictional Banks Grid */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 block">
                Simulated Partner Banks
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {SIMULATED_PARTNER_BANKS.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handleSelectBank(b)}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between ${
                      selectedBank.id === b.id
                        ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-600/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`w-8 h-8 rounded-xl ${b.badgeColor} text-white font-bold text-xs flex items-center justify-center`}>
                        {b.code.slice(0, 2)}
                      </div>
                      {b.popular && (
                        <span className="text-[9px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.5 rounded-full">
                          Partner
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 line-clamp-1">{b.name}</p>
                      <p className="text-[10px] text-slate-500 line-clamp-1">{b.tagline}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Account Details Form */}
            <form onSubmit={handleStartLinking} method="POST" className="space-y-4 pt-2 border-t border-slate-100">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Building2 size={18} className="text-indigo-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-slate-900">{selectedBank.name}</p>
                    <p className="text-[11px] text-slate-500 font-mono">Gateway: {selectedBank.code}</p>
                  </div>
                </div>
                <Badge variant="indigo" size="sm">Selected</Badge>
              </div>

              <Input
                id="onboardAccNum"
                name="accountNumber"
                label="Simulated Account Number"
                placeholder="e.g. 5010082910394"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                required
                inputMode="numeric"
                helperText="Simulated 8 to 16 digit bank account number"
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="onboardIfsc"
                  name="ifscCode"
                  label="IFSC Code"
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                  required
                  autoCapitalize="characters"
                />

                <div className="space-y-1.5 text-left">
                  <label htmlFor="onboardAccType" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Account Type
                  </label>
                  <select
                    id="onboardAccType"
                    name="accountType"
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value as 'Savings' | 'Current')}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="Savings">Savings</option>
                    <option value="Current">Current</option>
                  </select>
                </div>
              </div>

              {/* Security PIN setup */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <Input
                  id="onboardPin"
                  name="securityPin"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  label="Create Security PIN"
                  placeholder="••••"
                  value={securityPin}
                  onChange={(e) => setSecurityPin(e.target.value)}
                  required
                />

                <Input
                  id="onboardConfirmPin"
                  name="confirmPin"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  label="Confirm PIN"
                  placeholder="••••"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value)}
                  required
                />
              </div>

              <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-950 flex items-start gap-2">
                <CreditCard size={17} className="text-indigo-600 shrink-0 mt-0.5" />
                <span>
                  On linking, VaultPay will provision a simulated testing balance of <strong>₹25,000.00</strong> to test transfers.
                </span>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                leftIcon={<Lock size={17} />}
                className="mt-2"
              >
                Authenticate & Link {selectedBank.name}
              </Button>
            </form>
          </Card>
        )}

        {/* STEP 3: Animated Verification Handshake */}
        {step === 3 && (
          <Card padding="lg" className="shadow-elevated text-center space-y-6 py-12">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
              <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
              <ShieldCheck size={32} className="text-indigo-600" />
            </div>

            <div className="space-y-2">
              <h1 className="text-xl font-bold text-slate-900">
                Authorizing Bank Mandate
              </h1>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                {verificationStatusText}
              </p>
            </div>

            {/* Visual animated progress bar */}
            <div className="max-w-xs mx-auto space-y-1.5">
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-600 h-full rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${verificationProgress}%` }}
                />
              </div>
              <span className="text-[11px] font-mono text-slate-400 font-semibold">
                {verificationProgress}% Completed
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 max-w-xs mx-auto text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
              <Lock size={13} className="text-emerald-500" />
              <span>Simulated 256-bit encrypted bank handshake</span>
            </div>
          </Card>
        )}

        {/* STEP 4: Success Celebration */}
        {step === 4 && (
          <Card padding="lg" className="shadow-elevated text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 size={36} />
            </div>

            <div className="space-y-1">
              <Badge variant="success">Bank Account Linked</Badge>
              <h1 className="text-2xl font-bold text-slate-900 mt-2">
                You're Ready to Pay & Transact!
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                {selectedBank.name} has been set as your primary simulated funding source.
              </p>
            </div>

            {/* Linked Bank Card Summary */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2.5 text-xs max-w-md mx-auto">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200/70">
                <span className="font-semibold text-slate-600">Bank Partner:</span>
                <span className="font-bold text-slate-900">{selectedBank.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Account Mask:</span>
                <span className="font-mono font-bold text-slate-800">•••• {accountNumber.slice(-4)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">IFSC Code:</span>
                <span className="font-mono text-slate-800">{ifscCode}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200/70">
                <span className="text-slate-500">Provisioned Sandbox Balance:</span>
                <span className="font-mono font-bold text-emerald-600 text-sm">₹25,000.00</span>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => navigate('/')}
              rightIcon={<ArrowRight size={18} />}
            >
              Enter VaultPay Dashboard
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
};
