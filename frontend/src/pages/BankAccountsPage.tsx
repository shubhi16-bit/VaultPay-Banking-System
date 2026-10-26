import React, { useState } from 'react';
import { useBank } from '../context/BankContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Input';
import { Alert } from '../components/common/Alert';
import { formatCurrency, formatDate } from '../utils/formatters';
import { SIMULATED_PARTNER_BANKS } from '../services/mockData';
import type { BankAccount } from '../types';
import {
  Landmark,
  PlusCircle,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Trash2,
  Building2,
  AlertTriangle,
} from 'lucide-react';

export const BankAccountsPage: React.FC = () => {
  const {
    bankAccounts,
    linkNewBankAccount,
    unlinkBankAccount,
    setPrimaryAccount,
    isLoading,
  } = useBank();

  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [accountToUnlink, setAccountToUnlink] = useState<BankAccount | null>(null);

  // Link Form state
  const [selectedBankCode, setSelectedBankCode] = useState(SIMULATED_PARTNER_BANKS[0].code);
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState(SIMULATED_PARTNER_BANKS[0].ifscPrefix);
  const [accountType, setAccountType] = useState<'Savings' | 'Current'>('Savings');
  const [initialDeposit, setInitialDeposit] = useState('25000');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [unlinkError, setUnlinkError] = useState<string | null>(null);
  const [isUnlinking, setIsUnlinking] = useState(false);

  // Selected bank details
  const activeBankConfig =
    SIMULATED_PARTNER_BANKS.find((b) => b.code === selectedBankCode) ||
    SIMULATED_PARTNER_BANKS[0];

  const handleBankSelectChange = (code: string) => {
    setSelectedBankCode(code);
    const bank = SIMULATED_PARTNER_BANKS.find((b) => b.code === code);
    if (bank) {
      setIfscCode(bank.ifscPrefix);
    }
  };

  const handleLinkBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkError(null);

    const cleanAcc = accountNumber.replace(/\s+/g, '');
    if (cleanAcc.length < 8) {
      setLinkError('Account number must contain at least 8 digits.');
      return;
    }

    if (!ifscCode.trim()) {
      setLinkError('IFSC code is required.');
      return;
    }

    const depositNum = parseFloat(initialDeposit);
    if (isNaN(depositNum) || depositNum < 0) {
      setLinkError('Initial deposit must be a valid amount.');
      return;
    }

    setIsLinking(true);

    try {
      const res = await linkNewBankAccount({
        bankName: activeBankConfig.name,
        accountNumber: cleanAcc,
        ifscCode: ifscCode.trim().toUpperCase(),
        accountType,
        initialDeposit: depositNum,
      });

      if (res.success) {
        setIsLinkModalOpen(false);
        setAccountNumber('');
        setInitialDeposit('25000');
      } else {
        setLinkError(res.error || 'Failed to link account.');
      }
    } catch {
      setLinkError('An unexpected error occurred during account linking.');
    } finally {
      setIsLinking(false);
    }
  };

  const handleConfirmUnlink = async () => {
    if (!accountToUnlink) return;
    setUnlinkError(null);
    setIsUnlinking(true);

    try {
      const res = await unlinkBankAccount(accountToUnlink.id);
      if (res.success) {
        setAccountToUnlink(null);
      } else {
        setUnlinkError(res.error || 'Failed to unlink account.');
      }
    } catch {
      setUnlinkError('An unexpected error occurred while unlinking.');
    } finally {
      setIsUnlinking(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Landmark size={24} className="text-indigo-600" />
            <span>Linked Bank Accounts</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage simulated partner bank accounts and primary debit sources
          </p>
        </div>

        <Button
          variant="primary"
          leftIcon={<PlusCircle size={17} />}
          onClick={() => {
            setLinkError(null);
            setIsLinkModalOpen(true);
          }}
        >
          Link Another Bank
        </Button>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="py-12 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Loading linked accounts...</p>
        </div>
      ) : bankAccounts.length === 0 ? (
        /* Empty State */
        <Card padding="lg" className="text-center py-12 space-y-4 shadow-sm border border-slate-200">
          <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto shadow-sm">
            <Building2 size={32} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">No Bank Accounts Linked</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
              Link a simulated partner bank account to start sending payments, receiving money, and depositing wallet funds.
            </p>
          </div>
          <Button
            variant="primary"
            leftIcon={<PlusCircle size={16} />}
            onClick={() => setIsLinkModalOpen(true)}
          >
            Link Your First Bank Account
          </Button>
        </Card>
      ) : (
        /* Accounts Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bankAccounts.map((account) => {
            const partnerInfo = SIMULATED_PARTNER_BANKS.find(
              (p) => p.name.toLowerCase() === account.bankName.toLowerCase() || p.code === account.bankCode
            );

            return (
              <Card
                key={account.id}
                padding="lg"
                className={`relative overflow-hidden transition-all shadow-sm ${
                  account.isPrimary
                    ? 'border-indigo-600 ring-2 ring-indigo-600/10 bg-gradient-to-b from-white to-indigo-50/20'
                    : 'border-slate-200 bg-white'
                }`}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-sm shadow-sm ${
                        partnerInfo?.badgeColor || 'bg-indigo-600'
                      } text-white`}
                    >
                      {account.bankCode.slice(0, 4)}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{account.bankName}</span>
                      </h3>
                      <p className="text-xs text-slate-500">
                        {account.accountType} Account • {partnerInfo?.tagline || 'Simulated Retail Bank'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {account.isPrimary ? (
                      <Badge variant="indigo" dot>
                        Primary Account
                      </Badge>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setPrimaryAccount(account.id)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors px-2 py-1 rounded-lg hover:bg-indigo-50"
                      >
                        Make Primary
                      </button>
                    )}
                  </div>
                </div>

                {/* Account Details Grid */}
                <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 font-medium">Masked Account Number</span>
                    <p className="font-mono font-bold text-slate-800 text-sm mt-0.5">
                      {account.maskedAccountNumber}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium">IFSC Code</span>
                    <p className="font-mono font-semibold text-slate-800 text-sm mt-0.5">
                      {account.ifscCode}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium">Simulated Balance</span>
                    <p className="font-mono font-bold text-emerald-600 text-base mt-0.5">
                      {formatCurrency(account.balance)}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400 font-medium">Linked Date</span>
                    <p className="text-slate-700 font-medium mt-0.5">
                      {formatDate(account.linkedAt).split(',')[0]}
                    </p>
                  </div>
                </div>

                {/* Footer Actions & Security Badges */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-emerald-600 font-medium">
                      <ShieldCheck size={14} />
                      Simulated 2FA
                    </span>
                    <span className="flex items-center gap-1">
                      <Lock size={12} />
                      Masked Storage
                    </span>
                  </div>

                  {/* Unlink Action */}
                  {bankAccounts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        setUnlinkError(null);
                        setAccountToUnlink(account);
                      }}
                      className="text-rose-500 hover:text-rose-700 font-medium flex items-center gap-1 transition-colors"
                      title="Unlink this bank account"
                    >
                      <Trash2 size={13} />
                      <span>Unlink</span>
                    </button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Security Architecture Notice */}
      <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200/80 text-xs text-slate-600 space-y-1 text-left">
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
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        title="Link Simulated Bank Account"
        description="Choose a partner bank to test multi-bank transfers and deposits."
      >
        {linkError && (
          <Alert variant="danger" title="Account Linking Error" className="mb-4">
            {linkError}
          </Alert>
        )}

        <form onSubmit={handleLinkBank} className="space-y-4 text-left">
          {/* Bank selector */}
          <div className="space-y-1.5">
            <label
              htmlFor="partnerBank"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
            >
              Select Partner Bank
            </label>
            <select
              id="partnerBank"
              value={selectedBankCode}
              onChange={(e) => handleBankSelectChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            >
              {SIMULATED_PARTNER_BANKS.map((bank) => (
                <option key={bank.code} value={bank.code}>
                  {bank.name} ({bank.code}) — {bank.tagline}
                </option>
              ))}
            </select>
          </div>

          {/* Account Number Input */}
          <Input
            id="modalAccNum"
            name="accountNumber"
            label="Account Number (Min. 8 digits)"
            placeholder="e.g. 501004829104"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9]/g, ''))}
            required
            inputMode="numeric"
            maxLength={18}
            helperText="Account number will be masked automatically (•••• 9104)"
          />

          {/* IFSC Code & Account Type */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              id="modalIfsc"
              name="ifsc"
              label="IFSC Code"
              value={ifscCode}
              onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
              required
            />

            <div className="space-y-1.5">
              <label
                htmlFor="modalType"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Account Type
              </label>
              <select
                id="modalType"
                value={accountType}
                onChange={(e) => setAccountType(e.target.value as 'Savings' | 'Current')}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                <option value="Savings">Savings Account</option>
                <option value="Current">Current Account</option>
              </select>
            </div>
          </div>

          {/* Simulated Initial Deposit */}
          <Input
            id="modalInitialDeposit"
            name="initialDeposit"
            label="Initial Simulated Balance (INR)"
            value={initialDeposit}
            onChange={(e) => setInitialDeposit(e.target.value.replace(/[^0-9.]/g, ''))}
            inputMode="decimal"
            placeholder="25000"
            helperText="Demo funds allocated to test outgoing payments"
          />

          {/* Security Reassurance */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-center gap-2">
            <Lock size={14} className="text-indigo-600 shrink-0" />
            <span>VaultPay does not connect to real banks or real-money UPI networks.</span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              fullWidth
              disabled={isLinking}
              onClick={() => setIsLinkModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              fullWidth
              isLoading={isLinking}
              leftIcon={<PlusCircle size={16} />}
            >
              Confirm &amp; Link Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* Unlink Account Confirmation Modal */}
      {accountToUnlink && (
        <Modal
          isOpen={Boolean(accountToUnlink)}
          onClose={() => setAccountToUnlink(null)}
          title="Unlink Bank Account"
        >
          <div className="space-y-4 text-left">
            {unlinkError && (
              <Alert variant="danger" title="Unlink Error">
                {unlinkError}
              </Alert>
            )}

            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold">Are you sure you want to unlink this account?</p>
                <p className="text-rose-900 leading-relaxed">
                  <strong>{accountToUnlink.bankName}</strong> ({accountToUnlink.maskedAccountNumber}) will be removed from your payment sources.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                fullWidth
                disabled={isUnlinking}
                onClick={() => setAccountToUnlink(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                fullWidth
                isLoading={isUnlinking}
                onClick={handleConfirmUnlink}
                leftIcon={<Trash2 size={16} />}
              >
                Confirm Unlink
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
