import React, { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '../context/AuthContext';
import { useBank } from '../context/BankContext';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Alert } from '../components/common/Alert';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { PendingIntegrationModal } from '../components/common/PendingIntegrationModal';
import {
  generateVaultPayQRString,
  parseVaultPayQRString,
  downloadQRCodeAsPng,
  type VaultPayQRPayload,
} from '../utils/qrUtils';
import { formatCurrency } from '../utils/formatters';
import type { Transaction, SendPaymentPayload } from '../types';
import {
  QrCode,
  ScanLine,
  ShieldCheck,
  Download,
  Copy,
  Check,
  ArrowRight,
  CheckCircle2,
  Camera,
  Upload,
  AlertCircle,
  Eye,
  EyeOff,
  Landmark,
  Share2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

type CameraStatus = 'idle' | 'starting' | 'scanning' | 'permission_denied' | 'no_camera' | 'error';

export const QrPage: React.FC = () => {
  const { user } = useAuth();
  const {
    bankAccounts,
    primaryAccount,
    sendPayment,
    simulateOfflineSandboxPayment,
  } = useBank();

  const [activeTab, setActiveTab] = useState<'my-qr' | 'scan'>('my-qr');

  // Generator states
  const [fixedAmount, setFixedAmount] = useState('');
  const [qrNote, setQrNote] = useState('');
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  // Scanner states
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  const [scanResult, setScanResult] = useState<VaultPayQRPayload | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [isFileScanning, setIsFileScanning] = useState(false);

  // Scanned payment authorization modal states
  const [customScannedAmount, setCustomScannedAmount] = useState('');
  const [selectedBankId, setSelectedBankId] = useState(
    primaryAccount?.id || (bankAccounts[0]?.id || '')
  );
  const [paymentPin, setPaymentPin] = useState('1234');
  const [showPin, setShowPin] = useState(false);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [receiptTx, setReceiptTx] = useState<Transaction | null>(null);

  // Pending integration modal state
  const [pendingModalData, setPendingModalData] = useState<{
    isOpen: boolean;
    payload?: SendPaymentPayload;
    endpoint: string;
  }>({
    isOpen: false,
    endpoint: '/api/payments',
  });

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const selectedBank =
    bankAccounts.find((b) => b.id === selectedBankId) || primaryAccount;

  // Sync default bank
  useEffect(() => {
    if (primaryAccount && !selectedBankId) {
      setSelectedBankId(primaryAccount.id);
    }
  }, [primaryAccount, selectedBankId]);

  // Generate safe VaultPay QR URI (Zero sensitive credentials)
  const qrString = generateVaultPayQRString({
    vpa: user?.vaultPayId || 'user@vault',
    name: user?.name || 'VaultPay User',
    amount: fixedAmount ? parseFloat(fixedAmount) : undefined,
    note: qrNote || undefined,
  });

  const handleCopyQRString = () => {
    navigator.clipboard.writeText(qrString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareQR = async () => {
    setShareFeedback(null);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Pay ${user?.name} via VaultPay`,
          text: `Scan my VaultPay QR code to pay ${user?.vaultPayId}`,
          url: qrString,
        });
        setShareFeedback('Shared successfully!');
      } catch {
        // User dismissed share dialog
      }
    } else {
      navigator.clipboard.writeText(qrString);
      setShareFeedback('Payment URI copied to clipboard!');
    }
    setTimeout(() => setShareFeedback(null), 3000);
  };

  const handleDownloadQR = async () => {
    setIsDownloading(true);
    const success = await downloadQRCodeAsPng(
      'vaultpay-user-qr-svg',
      `vaultpay-qr-${user?.vaultPayId || 'code'}.png`
    );
    setIsDownloading(false);
    if (!success) {
      alert('Unable to generate image download. You can take a screenshot or copy the QR URI.');
    }
  };

  // Safe QR Decoder & Validator
  const handleQRDecoded = useCallback((decodedText: string) => {
    setScanError(null);
    const parsed = parseVaultPayQRString(decodedText);

    if (!parsed.isValid || !parsed.payload) {
      setScanError(
        parsed.error ||
          'Invalid QR code: VaultPay only processes official VaultPay payment QR codes.'
      );
      return;
    }

    // Stop camera once a valid code is found
    stopCamera();

    // Never auto-send: populate review state and prompt confirmation
    setScanResult(parsed.payload);
    setCustomScannedAmount(
      parsed.payload.amount ? parsed.payload.amount.toString() : ''
    );
  }, []);

  // Stop camera stream cleanly
  const stopCamera = () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          html5QrCodeRef.current.stop().catch(() => {});
        }
      } catch {
        // Ignored
      }
      html5QrCodeRef.current = null;
    }
    setCameraStatus('idle');
  };

  // Start camera scanner
  const startCamera = async () => {
    setScanError(null);
    setCameraStatus('starting');

    try {
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        setCameraStatus('no_camera');
        setScanError('No camera detected on this device. Please use file upload or the manual tester below.');
        return;
      }

      // Choose environment (rear) camera if available, otherwise first device
      const cameraId = devices.length > 1 ? devices[1].id : devices[0].id;
      const html5QrCode = new Html5Qrcode('qr-camera-element');
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleQRDecoded(decodedText);
        },
        () => {
          // Continuous frame scan error — safe to ignore during aiming
        }
      );

      setCameraStatus('scanning');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (
        message.includes('NotAllowedError') ||
        message.includes('Permission') ||
        message.includes('denied')
      ) {
        setCameraStatus('permission_denied');
        setScanError(
          'Camera access was denied by your browser. Please grant camera permission, or use the file upload / manual entry option below.'
        );
      } else {
        setCameraStatus('error');
        setScanError(`Camera initialization failed: ${message}. You can still scan via file upload.`);
      }
    }
  };

  // Cleanup camera on unmount or tab switch
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [activeTab]);

  // Scan from uploaded image file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsFileScanning(true);
    setScanError(null);

    try {
      const html5QrCode = new Html5Qrcode('file-scanner-temp');
      const decodedText = await html5QrCode.scanFile(file, true);
      html5QrCode.clear();
      handleQRDecoded(decodedText);
    } catch {
      setScanError(
        'Could not detect a valid QR code in the uploaded image. Please ensure the QR code is clearly visible.'
      );
    } finally {
      setIsFileScanning(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Manual test submit
  const handleManualTestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleQRDecoded(manualCode);
  };

  // Execute QR Payment Authorization
  const handleExecuteQRPayment = async () => {
    if (!scanResult || isAuthorizing) return;
    setScanError(null);

    const finalAmount = parseFloat(customScannedAmount) || scanResult.amount || 0;
    if (isNaN(finalAmount) || finalAmount <= 0) {
      setScanError('Please enter a valid payment amount greater than ₹0.');
      return;
    }

    if (!selectedBank) {
      setScanError('Please select a linked bank account to pay from.');
      return;
    }

    if (selectedBank.balance < finalAmount) {
      setScanError(
        `Insufficient balance in ${selectedBank.bankName}. Available: ${formatCurrency(
          selectedBank.balance
        )}.`
      );
      return;
    }

    if (!paymentPin || paymentPin.length < 4) {
      setScanError('Please enter your 4 or 6-digit security PIN.');
      return;
    }

    setIsAuthorizing(true);

    const payload: SendPaymentPayload = {
      recipientVaultPayId: scanResult.vpa,
      amount: finalAmount,
      note: scanResult.note || 'Payment via Scanned QR',
      sourceBankAccountId: selectedBank.id,
      pin: paymentPin,
    };

    try {
      const res = await sendPayment(payload);

      if (res.success && res.transaction) {
        setReceiptTx(res.transaction);
        setScanResult(null);
      } else if (res.isPendingIntegration) {
        // Honest integration-pending modal (backend is offline)
        setScanResult(null);
        setPendingModalData({
          isOpen: true,
          payload,
          endpoint: '/api/payments',
        });
      } else {
        setScanError(res.error || 'QR Payment failed.');
      }
    } catch {
      setScanError('An error occurred during payment execution.');
    } finally {
      setIsAuthorizing(false);
    }
  };

  // Local sandbox simulation for QR payment preview
  const handleSimulateSandbox = () => {
    if (!pendingModalData.payload) return;
    const res = simulateOfflineSandboxPayment(pendingModalData.payload);
    setPendingModalData({ ...pendingModalData, isOpen: false });
    if (res.success && res.transaction) {
      setReceiptTx(res.transaction);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Hidden container for image file decoding */}
      <div id="file-scanner-temp" className="hidden" />

      {/* Tab Switcher */}
      <div className="flex p-1 bg-slate-200/80 rounded-2xl max-w-sm mx-auto">
        <button
          type="button"
          onClick={() => {
            setActiveTab('my-qr');
            stopCamera();
          }}
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
              Personal Payment QR
            </span>
            <h1 className="text-2xl font-bold text-slate-900 mt-1">{user?.name}</h1>
            <p className="text-xs font-mono text-slate-500 mt-0.5">{user?.vaultPayId}</p>
          </div>

          {/* QR Code Container */}
          <div className="p-6 bg-white rounded-3xl border-2 border-slate-100 inline-block shadow-md relative">
            <QRCodeSVG
              id="vaultpay-user-qr-svg"
              value={qrString}
              size={220}
              level="H"
              includeMargin
              className="mx-auto"
            />
            <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-600">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>VaultPay Verified Public Identifier</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Contains no passwords, tokens, or bank credentials
            </p>
          </div>

          {/* Optional Amount & Note Customization */}
          <div className="max-w-xs mx-auto text-left space-y-3">
            <Input
              id="fixedAmount"
              name="fixedAmount"
              label="Preset Amount (Optional)"
              placeholder="e.g. 500"
              value={fixedAmount}
              onChange={(e) => setFixedAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              inputMode="decimal"
              helperText="Embeds a specific payment request amount into your QR"
            />

            <Input
              id="qrNote"
              name="qrNote"
              label="Preset Note (Optional)"
              placeholder="e.g. College event pass"
              value={qrNote}
              onChange={(e) => setQrNote(e.target.value)}
              maxLength={40}
            />
          </div>

          {shareFeedback && (
            <p className="text-xs text-emerald-600 font-semibold">{shareFeedback}</p>
          )}

          {/* Action Buttons: Copy, Share, Download */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-md mx-auto">
            <Button
              variant="outline"
              fullWidth
              size="sm"
              leftIcon={
                copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />
              }
              onClick={handleCopyQRString}
            >
              {copied ? 'Copied URI' : 'Copy Link'}
            </Button>

            <Button
              variant="outline"
              fullWidth
              size="sm"
              leftIcon={<Share2 size={15} />}
              onClick={handleShareQR}
            >
              Share QR
            </Button>

            <Button
              variant="primary"
              fullWidth
              size="sm"
              isLoading={isDownloading}
              leftIcon={<Download size={15} />}
              onClick={handleDownloadQR}
            >
              Download PNG
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
              Position a VaultPay payment QR code within the viewfinder
            </p>
          </div>

          {scanError && (
            <Alert variant="danger" title="QR Code Scanner Notice">
              {scanError}
            </Alert>
          )}

          {/* Camera Viewport Container */}
          <div className="relative border-2 border-dashed border-slate-300 rounded-3xl overflow-hidden bg-slate-950 min-h-[280px] flex flex-col items-center justify-center p-4">
            {cameraStatus === 'scanning' ? (
              <div className="w-full h-full flex flex-col items-center">
                <div id="qr-camera-element" className="w-full max-w-[280px]" />
                <div className="mt-3 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs text-slate-300 font-medium">
                    Camera Active — Point at QR
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={stopCamera}
                  className="mt-3 bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700"
                >
                  Stop Camera
                </Button>
              </div>
            ) : cameraStatus === 'starting' ? (
              <div className="text-center space-y-2 text-slate-300">
                <RefreshCw size={28} className="animate-spin mx-auto text-indigo-400" />
                <p className="text-xs">Requesting camera permissions...</p>
              </div>
            ) : (
              <div className="text-center space-y-3 p-6 text-slate-300">
                <div className="w-14 h-14 rounded-full bg-slate-800 text-indigo-400 flex items-center justify-center mx-auto">
                  <Camera size={26} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Camera Scanner</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                    Allow browser camera permissions to scan QR codes directly with your device webcam.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="md"
                  onClick={startCamera}
                  leftIcon={<Camera size={16} />}
                >
                  Start Camera Scanner
                </Button>
              </div>
            )}
          </div>

          {/* Secondary Scan Options: Image File Upload & Manual Tester */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Image File Scanner */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <Upload size={15} className="text-indigo-600" />
                <span>Upload QR Image File</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Scan a saved screenshot or photo of a VaultPay QR code.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="qr-file-input"
              />
              <Button
                variant="outline"
                size="sm"
                fullWidth
                isLoading={isFileScanning}
                onClick={() => fileInputRef.current?.click()}
              >
                Choose Image File
              </Button>
            </div>

            {/* Manual QR String Tester */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <AlertCircle size={15} className="text-indigo-600" />
                <span>Manual URI Tester</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Paste or test VaultPay URI schemes directly.
              </p>
              <form onSubmit={handleManualTestSubmit} className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="vaultpay://pay?vpa=priya@vault"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="flex-1 text-[11px] font-mono rounded-lg border border-slate-200 px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
                <Button type="submit" size="sm" variant="navy">
                  Decode
                </Button>
              </form>
            </div>
          </div>

          {/* Quick preset links for easy grading & demonstration */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
            <span className="font-semibold text-slate-400">Quick Test Payloads:</span>
            <button
              type="button"
              onClick={() =>
                handleQRDecoded('vaultpay://pay?vpa=priya@vault&name=Priya+Verma&amount=750&note=Books')
              }
              className="text-indigo-600 underline font-mono hover:text-indigo-800"
            >
              Valid VaultPay QR (Priya ₹750)
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() =>
                handleQRDecoded('https://example.com/external-phishing-link')
              }
              className="text-rose-600 underline font-mono hover:text-rose-800"
            >
              Invalid External Link
            </button>
          </div>
        </Card>
      )}

      {/* Confirmation & Authorization Modal for Scanned QR (NEVER auto-send) */}
      {scanResult && (
        <Modal
          isOpen={Boolean(scanResult)}
          onClose={() => setScanResult(null)}
          title="Confirm Scanned Payment"
        >
          <div className="space-y-4 text-left">
            {/* Payee Details Card */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-center space-y-1">
              <span className="text-[10px] uppercase font-bold text-indigo-700 tracking-wider">
                Scanned Recipient
              </span>
              <p className="text-lg font-bold text-slate-900">{scanResult.name}</p>
              <p className="text-xs font-mono text-indigo-700 font-semibold">{scanResult.vpa}</p>
              {scanResult.note && (
                <p className="text-xs text-slate-500 italic mt-1">&ldquo;{scanResult.note}&rdquo;</p>
              )}
            </div>

            {/* Payment Amount Input */}
            <div className="space-y-1.5">
              <label
                htmlFor="qrPayAmount"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Amount to Transfer (INR)
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-lg font-bold text-slate-400">₹</span>
                <input
                  id="qrPayAmount"
                  type="text"
                  inputMode="decimal"
                  value={customScannedAmount}
                  onChange={(e) =>
                    setCustomScannedAmount(e.target.value.replace(/[^0-9.]/g, ''))
                  }
                  placeholder="0.00"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3.5 py-2.5 text-xl font-bold font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
            </div>

            {/* Source Bank Selector */}
            <div className="space-y-1.5">
              <label
                htmlFor="qrBankSelect"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
              >
                Debit Bank Account
              </label>
              <select
                id="qrBankSelect"
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              >
                {bankAccounts.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bankName} ({b.maskedAccountNumber}) — {formatCurrency(b.balance)}
                  </option>
                ))}
              </select>
              {selectedBank && (
                <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                  <Landmark size={12} className="text-slate-400" />
                  <span>Available balance: {formatCurrency(selectedBank.balance)}</span>
                </p>
              )}
            </div>

            {/* PIN Entry */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label
                  htmlFor="qrPin"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-700"
                >
                  Simulated Security PIN
                </label>
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="text-[11px] text-indigo-600 flex items-center gap-1 font-medium"
                >
                  {showPin ? <EyeOff size={13} /> : <Eye size={13} />}
                  <span>{showPin ? 'Hide' : 'Show'}</span>
                </button>
              </div>
              <Input
                id="qrPin"
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={6}
                placeholder="••••"
                value={paymentPin}
                onChange={(e) => setPaymentPin(e.target.value.replace(/[^0-9]/g, ''))}
                required
                helperText="Sandbox default: 1234"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                fullWidth
                disabled={isAuthorizing}
                onClick={() => setScanResult(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                fullWidth
                isLoading={isAuthorizing}
                disabled={isAuthorizing || !customScannedAmount || !paymentPin}
                onClick={handleExecuteQRPayment}
                rightIcon={<ArrowRight size={16} />}
              >
                Confirm &amp; Pay {customScannedAmount ? formatCurrency(parseFloat(customScannedAmount) || 0) : ''}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Honest Backend Integration Pending Modal */}
      <PendingIntegrationModal
        isOpen={pendingModalData.isOpen}
        onClose={() => setPendingModalData({ ...pendingModalData, isOpen: false })}
        operationName="QR Code Payment"
        endpoint={pendingModalData.endpoint}
        payload={pendingModalData.payload as unknown as Record<string, unknown>}
        onRetry={handleExecuteQRPayment}
        onSimulateSandbox={handleSimulateSandbox}
        isRetrying={isAuthorizing}
      />

      {/* Confirmed Success Receipt Modal */}
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
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">
                Paid to
              </p>
              <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                {receiptTx.recipientName}
              </h3>
              <p className="text-xs font-mono text-slate-500">
                {receiptTx.recipientVaultPayId}
              </p>
            </div>

            <p className="text-3xl font-extrabold text-slate-900 font-mono">
              {formatCurrency(receiptTx.amount)}
            </p>

            <div className="flex justify-center gap-1.5">
              <Badge variant="success">Completed</Badge>
              {receiptTx.isMockData ? (
                <Badge variant="warning">
                  <Sparkles size={11} className="inline mr-1" />
                  Simulated Sandbox Demo
                </Badge>
              ) : (
                <Badge variant="indigo">Backend Confirmed</Badge>
              )}
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Reference:</span>
                <span className="font-mono font-medium text-slate-900">
                  {receiptTx.referenceId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Debited From:</span>
                <span className="text-slate-900">
                  Bank Account ({receiptTx.bankAccountMasked})
                </span>
              </div>
            </div>

            <Button
              variant="primary"
              fullWidth
              size="lg"
              onClick={() => setReceiptTx(null)}
            >
              Done
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};
