/**
 * VaultPay QR Code Encoding and Validation Utilities
 * RULE: Make QR codes work ONLY with VaultPay's simulated payment identifiers.
 */

export interface VaultPayQRPayload {
  scheme: 'vaultpay';
  action: 'pay';
  vpa: string; // VaultPay ID e.g. shubhi@vault
  name: string;
  amount?: number;
  note?: string;
  timestamp: number;
}

/**
 * Encodes a payment target into a VaultPay QR URI string.
 */
export function generateVaultPayQRString(payload: Omit<VaultPayQRPayload, 'scheme' | 'action' | 'timestamp'>): string {
  const url = new URL('vaultpay://pay');
  url.searchParams.set('vpa', payload.vpa);
  url.searchParams.set('name', payload.name);
  if (payload.amount && payload.amount > 0) {
    url.searchParams.set('amount', payload.amount.toString());
  }
  if (payload.note) {
    url.searchParams.set('note', payload.note);
  }
  url.searchParams.set('ts', Date.now().toString());
  return url.toString();
}

export interface QRParseResult {
  isValid: boolean;
  error?: string;
  payload?: VaultPayQRPayload;
}

/**
 * Parses and verifies if scanned QR text is a genuine VaultPay payment identifier.
 * Explicitly rejects non-VaultPay QR codes.
 */
export function parseVaultPayQRString(qrText: string): QRParseResult {
  if (!qrText || typeof qrText !== 'string') {
    return { isValid: false, error: 'Empty or invalid QR code content.' };
  }

  const trimmed = qrText.trim();

  // Enforce VaultPay scheme
  if (!trimmed.startsWith('vaultpay://pay')) {
    return {
      isValid: false,
      error: 'Invalid QR code. VaultPay only accepts official VaultPay payment identifiers.',
    };
  }

  try {
    const url = new URL(trimmed);
    const vpa = url.searchParams.get('vpa');
    const name = url.searchParams.get('name') || 'VaultPay User';
    const amountStr = url.searchParams.get('amount');
    const note = url.searchParams.get('note') || undefined;
    const tsStr = url.searchParams.get('ts');

    if (!vpa || !vpa.includes('@')) {
      return {
        isValid: false,
        error: 'Malformed VaultPay identifier: Missing or invalid VaultPay ID.',
      };
    }

    const amount = amountStr ? parseFloat(amountStr) : undefined;
    if (amount !== undefined && (isNaN(amount) || amount <= 0)) {
      return {
        isValid: false,
        error: 'Invalid payment amount specified in QR code.',
      };
    }

    return {
      isValid: true,
      payload: {
        scheme: 'vaultpay',
        action: 'pay',
        vpa,
        name,
        amount,
        note,
        timestamp: tsStr ? parseInt(tsStr, 10) : Date.now(),
      },
    };
  } catch {
    return {
      isValid: false,
      error: 'Could not parse the QR code payload.',
    };
  }
}
