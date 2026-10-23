import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBank } from '../context/BankContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Badge } from '../components/common/Badge';
import { Alert } from '../components/common/Alert';
import { getInitials } from '../utils/formatters';
import {
  User as UserIcon,
  CheckCircle2,
  Lock,
  Edit3,
  X,
  Save,
  Phone,
  Mail,
  Calendar,
  Building2,
  Sparkles,
  ServerOff,
  ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const ProfilePage: React.FC = () => {
  const { user, updateProfile, updateLocalDemoProfile } = useAuth();
  const { primaryAccount } = useBank();
  const navigate = useNavigate();

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [backendPendingNotice, setBackendPendingNotice] = useState<string | null>(null);

  const handleStartEdit = () => {
    setName(user?.name || '');
    setPhone(user?.phone || '');
    setFormError(null);
    setSaveSuccess(null);
    setBackendPendingNotice(null);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setFormError(null);
    setBackendPendingNotice(null);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaveSuccess(null);
    setBackendPendingNotice(null);

    const cleanName = name.trim();
    if (cleanName.length < 2) {
      setFormError('Full name must be at least 2 characters.');
      return;
    }

    const cleanPhone = phone.trim();
    if (cleanPhone && cleanPhone.replace(/[^0-9]/g, '').length < 10) {
      setFormError('Please enter a valid phone number with at least 10 digits.');
      return;
    }

    setIsSaving(true);

    try {
      const res = await updateProfile({
        name: cleanName,
        phone: cleanPhone || undefined,
      });

      if (res.success && res.isBackendConfirmed) {
        setIsEditing(false);
        setSaveSuccess('Profile successfully updated and confirmed by backend!');
        setTimeout(() => setSaveSuccess(null), 4000);
      } else {
        // Live backend is offline
        setBackendPendingNotice(
          'Live backend service (http://localhost:5000) is offline. As required by project rules, profile changes are not marked as saved without backend confirmation (PUT /api/users/profile).'
        );
      }
    } catch {
      setFormError('An unexpected error occurred while saving profile changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApplyLocalDemoPreview = () => {
    updateLocalDemoProfile({
      name: name.trim(),
      phone: phone.trim() || undefined,
    });
    setIsEditing(false);
    setBackendPendingNotice(null);
    setSaveSuccess('Applied in local demo sandbox (offline preview).');
    setTimeout(() => setSaveSuccess(null), 4000);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <UserIcon size={24} className="text-indigo-600" />
            <span>My Profile</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Personal identity information and simulated payment credentials
          </p>
        </div>

        {!isEditing && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleStartEdit}
            leftIcon={<Edit3 size={15} />}
          >
            Edit Profile
          </Button>
        )}
      </div>

      {/* Success Notification */}
      {saveSuccess && (
        <Alert variant="success" title="Profile Status">
          {saveSuccess}
        </Alert>
      )}

      {/* Honest Backend Pending Notice */}
      {backendPendingNotice && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-left space-y-3">
          <div className="flex items-start gap-2.5">
            <ServerOff className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-950 space-y-1">
              <p className="font-bold">Backend Confirmation Pending</p>
              <p className="leading-relaxed">{backendPendingNotice}</p>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant="outline"
              onClick={handleApplyLocalDemoPreview}
              leftIcon={<Sparkles size={14} className="text-amber-600" />}
              className="border-amber-300 text-amber-900 hover:bg-amber-100/50"
            >
              Preview in Local Sandbox
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setBackendPendingNotice(null)}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Profile Card */}
      <Card padding="lg" className="shadow-sm bg-white border border-slate-200 space-y-6">
        {/* User Identity Header */}
        <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
          <div className="w-16 h-16 rounded-3xl bg-indigo-600 text-white font-extrabold text-xl flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
            {getInitials(user?.name || 'VaultPay')}
          </div>
          <div className="space-y-0.5 text-left">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{user?.name}</h2>
              <Badge variant={user?.role === 'admin' ? 'indigo' : 'neutral'}>
                {user?.role === 'admin' ? 'Security Admin' : 'Personal Account'}
              </Badge>
            </div>
            <p className="text-xs font-mono text-indigo-600 font-semibold">{user?.vaultPayId}</p>
            <p className="text-xs text-slate-400">{user?.email}</p>
          </div>
        </div>

        {/* View / Edit Mode */}
        {isEditing ? (
          <form onSubmit={handleSaveProfile} className="space-y-4 text-left">
            {formError && <Alert variant="danger">{formError}</Alert>}

            <Input
              id="profileName"
              name="name"
              label="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Alex Sharma"
            />

            <Input
              id="profilePhone"
              name="phone"
              label="Mobile Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              helperText="Used for transaction alerts and SMS verification"
            />

            {/* Non-editable identifiers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  VaultPay ID (Permanent)
                </label>
                <p className="font-mono text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200 mt-1">
                  {user?.vaultPayId}
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Email Address (Verified)
                </label>
                <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200 mt-1 truncate">
                  {user?.email}
                </p>
              </div>
            </div>

            {/* Edit Actions */}
            <div className="flex gap-3 pt-3">
              <Button
                type="button"
                variant="outline"
                fullWidth
                disabled={isSaving}
                onClick={handleCancelEdit}
                leftIcon={<X size={15} />}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                isLoading={isSaving}
                leftIcon={<Save size={15} />}
              >
                Save Profile Changes
              </Button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-left">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
              <span className="text-slate-400 flex items-center gap-1 font-medium">
                <UserIcon size={13} />
                Full Legal Name
              </span>
              <p className="font-bold text-slate-900 text-sm">{user?.name}</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
              <span className="text-slate-400 flex items-center gap-1 font-medium">
                <Mail size={13} />
                Verified Email
              </span>
              <p className="font-medium text-slate-900 text-sm truncate">{user?.email}</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
              <span className="text-slate-400 flex items-center gap-1 font-medium">
                <Phone size={13} />
                Contact Phone
              </span>
              <p className="font-medium text-slate-900 text-sm">
                {user?.phone || '+91 98765 43210'}
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-0.5">
              <span className="text-slate-400 flex items-center gap-1 font-medium">
                <Calendar size={13} />
                Member Since
              </span>
              <p className="font-medium text-slate-900 text-sm">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Jan 2026'}
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Linked Banking & Security Overview Card */}
      <Card padding="lg" className="bg-white border border-slate-200 shadow-sm space-y-4 text-left">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Primary Bank Channel</h3>
          </div>
          <button
            type="button"
            onClick={() => navigate('/accounts')}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
          >
            <span>Manage Banks</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {primaryAccount ? (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-bold text-slate-900">{primaryAccount.bankName}</p>
              <p className="text-xs font-mono text-slate-500">
                {primaryAccount.maskedAccountNumber} • {primaryAccount.ifscCode}
              </p>
            </div>
            <Badge variant="indigo" dot>
              Default Debit Source
            </Badge>
          </div>
        ) : (
          <p className="text-xs text-slate-400">No bank accounts linked.</p>
        )}

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1 text-emerald-600 font-medium">
            <CheckCircle2 size={13} />
            KYC Verified Simulator
          </span>
          <span className="flex items-center gap-1">
            <Lock size={12} />
            Encrypted Session
          </span>
        </div>
      </Card>
    </div>
  );
};
