import React, { useState } from 'react';
import { useBank } from '../context/BankContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Input';
import { Alert } from '../components/common/Alert';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  Landmark,
  PlusCircle,
  ShieldCheck,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export const BankAccountsPage: React.FC = () => {
  const { bankAccounts, linkNewBankAccount, setPrimaryAccount } = useBank();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states for linking additional bank
  const [bankName, setBankName] = useState('ICICI Bank');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('ICIC0007890');
  const [accountType, setAccountType] = useState<'Savings' | 'Current'>('Savings');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLinkBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (accountNumber.length < 8) {
      setError('Account number must be at least 8 digits.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await linkNewBankAccount({
        bankName,
        accountNumber,
        ifscCode,
        accountType,
        initialDeposit: 15000.00,
      });

      if (res.success) {
        setIsModalOpen(false);
        setAccountNumber('');
      } else {
        setError(res.error || 'Failed to link account.');
      }
    } catch {
      setError('An error occurred during account linking.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Landmark size={24} className="text-indigo-600" />
            <span>Linked Bank Accounts</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your simulated partner bank accounts and primary payment source
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<PlusCircle size={17} />}
          onClick={() => setIsModalOpen(true)}
        >
          Link Another Bank
        </Button>
      </div>

      {/* Bank Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {bankAccounts.map((account) => (
          <Card
            key={account.id}
            padding="lg"
            className={`relative overflow-hidden transition-all ${
              account.isPrimary
                ? 'border-indigo-600 ring-2 ring-indigo-600/10'
                : 'border-slate-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-sm">
                  {account.bankCode.slice(0, 4)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{account.bankName}</h3>
                  <p className="text-xs text-slate-500">{account.accountType} Account</p>
                </div>
              </div>

              {account.isPrimary ? (
                <Badge variant="indigo" dot>
                  Primary
                </Badge>
              ) : (
                <button
                  type="button"
                  onClick={() => setPrimaryAccount(account.id)}
                  className="text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
                >
                  Make Primary
                </button>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400">Account Number</span>
                <p className="font-mono font-bold text-slate-800 text-sm mt-0.5">
                  {account.maskedAccountNumber}
                </p>
              </div>

              <div>
                <span className="text-slate-400">IFSC Code</span>
                <p className="font-mono font-semibold text-slate-800 text-sm mt-0.5">
                  {account.ifscCode}
                </p>
              </div>

              <div>
                <span className="text-slate-400">Simulated Balance</span>
                <p className="font-mono font-bold text-emerald-600 text-base mt-0.5">
                  {formatCurrency(account.balance)}
                </p>
              </div>

              <div>
                <span className="text-slate-400">Linked On</span>
                <p className="text-slate-700 font-medium mt-0.5">
                  {formatDate(account.linkedAt).split(',')[0]}
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <ShieldCheck size={13} className="text-emerald-500" />
                Simulated 2FA Protected
              </span>
              <span className="flex items-center gap-1">
                <Lock size={12} />
                Encrypted UPI Link
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Security Architecture Notice */}
      <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200/80 text-xs text-slate-600 space-y-1">
        <p className="font-semibold text-slate-800 flex items-center gap-1.5">
          <CheckCircle2 size={16} className="text-indigo-600" />
          Zero Direct Database Connections
        </p>
        <p className="leading-relaxed">
          In adherence to banking security principles, the frontend never directly accesses MySQL databases or raw credentials. All operations communicate strictly via the centralized HTTP service layer.
        </p>
      </div>

      {/* Link Bank Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Link Another Bank Account"
        description="Add a simulated bank account to test multi-bank payments."
      >
        {error && <Alert variant="danger" className="mb-4">{error}</Alert>}

        <form onSubmit={handleLinkBank} method="POST" className="space-y-4">
          <div className="space-y-1.5 text-left">
            <label htmlFor="modalBank" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Select Bank
            </label>
            <select
              id="modalBank"
              value={bankName}
              onChange={(e) => {
                setBankName(e.target.value);
                if (e.target.value === 'ICICI Bank') setIfscCode('ICIC0007890');
                if (e.target.value === 'Axis Bank') setIfscCode('UTIB0001122');
                if (e.target.value === 'Kotak Mahindra') setIfscCode('KKBK0003344');
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="ICICI Bank">ICICI Bank</option>
              <option value="Axis Bank">Axis Bank</option>
              <option value="Kotak Mahindra">Kotak Mahindra Bank</option>
              <option value="Punjab National Bank">Punjab National Bank</option>
            </select>
          </div>

          <Input
            id="modalAccNum"
            name="accountNumber"
            label="Account Number"
            placeholder="e.g. 192837465019"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            required
            inputMode="numeric"
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              id="modalIfsc"
              name="ifsc"
              label="IFSC Code"
              value={ifscCode}
              onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
              required
            />

            <div className="space-y-1.5 text-left">
              <label htmlFor="modalType" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Type
              </label>
              <select
                id="modalType"
                value={accountType}
                onChange={(e) => setAccountType(e.target.value as 'Savings' | 'Current')}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="Savings">Savings</option>
                <option value="Current">Current</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-3">
            <Button variant="outline" fullWidth onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" fullWidth isLoading={isLoading}>
              Confirm Link
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
