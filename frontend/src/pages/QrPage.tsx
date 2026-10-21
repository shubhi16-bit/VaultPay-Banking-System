import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useAuth } from '../context/AuthContext';
import { useBank } from '../context/BankContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Alert } from '../components/common/Alert';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { generateVaultPayQRString, parseVaultPayQRString, type VaultPayQRPayload } from '../utils/qrUtils';
import { formatCurrency } from '../utils/formatters';
import type { Transaction } from '../types';
import { QrCode, ScanLine, ShieldCheck, Download, Copy, Check, ArrowRight, CheckCircle2 } from 'lucide-react';

export const QrPage: React.FC = () => {
  const { user } = useAuth();
  const { bankAccounts, primaryAccount, sendPayment } = useBank();

  const [activeTab, setActiveTab] = useState<'my-qr' | 'scan'>('my-qr');
  const [fixedAmount, setFixedAmount] = useState('');
  const [copied, setCopied] = useState(false);

  // Scanner states
  const [scanResult, setScanResult] = useState<VaultPayQRPayload | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentPin, setPaymentPin] = useState('1234');
  const [selectedBankId, setSelectedBankId] = useState(primaryAccount?.id || (bankAccounts[0]?.id || ''));
  const [receiptTx, setReceiptTx] = useState<Transaction | null>(null);

  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // QR URI string for the current user
  const qrString = generateVaultPayQRString({
    vpa: user?.vaultPayId || 'user@vault',
    name: user?.name || 'VaultPay User',
    amount: fixedAmount ? parseFloat(fixedAmount) : undefined,
  });

  const handleCopyQRString = () => {
    navigator.clipboard.writeText(qrString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Setup camera scanner when 'scan' tab is active
  useEffect(() => {
    if (activeTab === 'scan') {
      const scanner = new Html5QrcodeScanner(
        'qr-reader-container',
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        false
      );

      scanner.render(
        (decodedText) => {
          handleQRDecoded(decodedText);
          scanner.clear();
        },
        () => {
          // Frame errors can be ignored safely while aiming
        }
      );

      scannerRef.current = scanner;

      return () => {
        scanner.clear().catch(() => {});
      };
    }
  }, [activeTab]);

  const handleQRDecoded = (decodedText: string) => {
    setScanError(null);
    const parsed = parseVaultPayQRString(decodedText);

    if (!parsed.isValid || !parsed.payload) {
      setScanError(parsed.error || 'Invalid QR code. VaultPay only processes official VaultPay payment identifiers.');
      return;
    }

    setScanResult(parsed.payload);
  };

  const handleManualTestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleQRDecoded(manualCode);
  };

  const handleExecuteQRPayment = async () => {
    if (!scanResult) return;
    setScanError(null);

    const amount = scanResult.amount || 250.00; // Default if not specified in QR
    const bank = bankAccounts.find((b) => b.id === selectedBankId) || primaryAccount;

    if (!bank) {
      setScanError('Please select a linked bank account.');
      return;
    }

    if (bank.balance < amount) {
      setScanError(`Insufficient balance in ${bank.bankName}. Available: ${formatCurrency(bank.balance)}`);
      return;
    }

    setIsProcessingPayment(true);
    try {
      const res = await sendPayment({
        recipientVaultPayId: scanResult.vpa,
        amount,
        note: scanResult.note || 'Payment via QR Code',
        sourceBankAccountId: bank.id,
        pin: paymentPin,
      });

      if (res.success && res.transaction) {
        setReceiptTx(res.transaction);
        setScanResult(null);
      } else {
        setScanError(res.error || 'QR Payment failed');
      }
    } catch {
      setScanError('An error occurred during payment execution.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Tab Switcher */}
      <div className="flex p-1 bg-slate-200/80 rounded-2xl max-w-sm mx-auto">
        <button
          type="button"
          onClick={() => setActiveTab('my-qr')}
          className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'my-qr'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <QrCode size={16} />
          <span>My QR Code</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('scan')}
          className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeTab === 'scan'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <ScanLine size={16} />
          <span>Scan Any QR</span>
        </button>
      </div>

      {/* Tab 1: Show My QR Code */}
      {activeTab === 'my-qr' && (
        <Card padding="lg" className="shadow-elevated text-center space-y-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
              Personal Payment Code
            </span>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">{user?.name}</h1>
            <p className="text-xs font-mono text-slate-500 mt-0.5">{user?.vaultPayId}</p>
          </div>

          {/* QR Code Container with subtle logo badge */}
          <div className="p-6 bg-white rounded-3xl border-2 border-slate-100 inline-block shadow-md relative">
            <QRCodeSVG
              value={qrString}
              size={220}
              level="H"
              includeMargin
              className="mx-auto"
            />
            <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-500">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>VaultPay Verified Identifier</span>
            </div>
          </div>

          {/* Optional Amount Preset */}
          <div className="max-w-xs mx-auto text-left">
            <Input
              id="fixedAmount"
              name="fixedAmount"
              label="Set Specific Amount (Optional)"
              placeholder="e.g. 500"
              value={fixedAmount}
              onChange={(e) => setFixedAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              inputMode="decimal"
              helperText="Embed a preset amount into your QR code"
            />
          </div>

          <div className="flex gap-3 max-w-sm mx-auto">
            <Button
              variant="outline"
              fullWidth
              size="sm"
              leftIcon={copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
              onClick={handleCopyQRString}
            >
              {copied ? 'Copied URI' : 'Copy QR Payload'}
            </Button>
            <Button
              variant="primary"
              fullWidth
              size="sm"
              leftIcon={<Download size={16} />}
              onClick={() => alert('Simulated QR image saved to your device.')}
            >
              Save QR Image
            </Button>
          </div>
        </Card>
      )}

      {/* Tab 2: Scan QR Code */}
      {activeTab === 'scan' && (
        <Card padding="lg" className="shadow-elevated space-y-6 text-center">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center justify-center gap-2">
              <ScanLine size={22} className="text-indigo-600" />
              <span>Scan VaultPay QR Code</span>
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Point your camera at any VaultPay payment QR or test below
            </p>
          </div>

          {scanError && (
            <Alert variant="danger" title="QR Code Validation">
              {scanError}
            </Alert>
          )}

          {/* HTML5 QR Camera Scanner Target */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-900 min-h-[260px] flex items-center justify-center">
            <div id="qr-reader-container" className="w-full" />
          </div>

          {/* Fallback Simulator / Manual Test Code Input */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-3">
            <div>
              <p className="text-xs font-bold text-slate-800">
                Sandbox QR Payload Tester
              </p>
              <p className="text-[11px] text-slate-500">
                Test the strict VaultPay identifier validation manually without a camera.
              </p>
            </div>

            <form onSubmit={handleManualTestSubmit} className="flex gap-2">
              <input
                type="text"
                placeholder="vaultpay://pay?vpa=priya@vault&name=Priya&amount=450"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                className="flex-1 text-xs font-mono rounded-xl border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
              <Button type="submit" size="sm" variant="navy">
                Test QR
              </Button>
            </form>

            <div className="flex gap-2 text-[11px]">
              <span className="text-slate-400">Quick test:</span>
              <button
                type="button"
                onClick={() => setManualCode('vaultpay://pay?vpa=priya@vault&name=Priya+Verma&amount=750')}
                className="text-indigo-600 underline font-mono"
              >
                Valid VaultPay QR
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={() => setManualCode('https://example.com/not-vaultpay')}
                className="text-rose-600 underline font-mono"
              >
                Invalid External QR
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Scanned QR Payment Confirmation Modal */}
      {scanResult && (
        <Modal
          isOpen={Boolean(scanResult)}
          onClose={() => setScanResult(null)}
          title="Confirm QR Payment"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-center space-y-1">
              <span className="text-[11px] uppercase font-bold text-indigo-600 tracking-wider">
                Scanned Recipient
              </span>
              <p className="text-lg font-bold text-slate-900">{scanResult.name}</p>
              <p className="text-xs font-mono text-slate-600">{scanResult.vpa}</p>
            </div>

            <div className="text-center py-2">
              <span className="text-xs text-slate-400 font-medium">Payment Amount</span>
              <p className="text-3xl font-extrabold text-slate-900 font-mono mt-0.5">
                {formatCurrency(scanResult.amount || 250)}
              </p>
            </div>

            <div className="space-y-1.5 text-left">
              <label htmlFor="qrBank" className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                Pay From
              </label>
              <select
                id="qrBank"
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                {bankAccounts.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bankName} ({b.maskedAccountNumber}) — Bal: {formatCurrency(b.balance)}
                  </option>
                ))}
              </select>
            </div>

            <Input
              id="qrPin"
              type="password"
              inputMode="numeric"
              maxLength={6}
              label="UPI / Security PIN"
              placeholder="••••"
              value={paymentPin}
              onChange={(e) => setPaymentPin(e.target.value)}
              required
            />

            <div className="flex gap-3 pt-2">
              <Button variant="outline" fullWidth onClick={() => setScanResult(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                fullWidth
                isLoading={isProcessingPayment}
                onClick={handleExecuteQRPayment}
                rightIcon={<ArrowRight size={16} />}
              >
                Confirm & Pay
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Success Modal */}
      {receiptTx && (
        <Modal
          isOpen={Boolean(receiptTx)}
          onClose={() => setReceiptTx(null)}
          title="Payment Completed"
        >
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 size={36} />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase font-bold">Paid to</p>
              <h3 className="text-xl font-bold text-slate-900">{receiptTx.recipientName}</h3>
              <p className="text-xs font-mono text-slate-500">{receiptTx.recipientVaultPayId}</p>
            </div>
            <p className="text-3xl font-extrabold text-slate-900 font-mono">
              {formatCurrency(receiptTx.amount)}
            </p>
            <div className="flex justify-center">
              <Badge variant="success">Completed</Badge>
            </div>
            <Button variant="primary" fullWidth size="lg" onClick={() => setReceiptTx(null)}>
              Done
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
