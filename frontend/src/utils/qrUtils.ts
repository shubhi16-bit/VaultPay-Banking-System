/**
 * VaultPay QR Code Encoding and Validation Utilities
 * 
 * SECURITY MANDATE:
 * QR codes generated or scanned in VaultPay must contain ONLY public payment
 * identifiers (VaultPay ID, payee display name, optional preset amount, and optional note).
 * NEVER embed authentication tokens, passwords, PINs, or bank account credentials.
 */

import { isValidVaultPayId } from './formatters';

export interface VaultPayQRPayload {
  scheme: 'vaultpay';
  action: 'pay';
  vpa: string; // Recipient VaultPay ID (e.g. priya@vault)
  name: string; // Display name
  amount?: number; // Optional preset amount
  note?: string; // Optional description
  timestamp: number;
}

export interface QRParseResult {
  isValid: boolean;
  error?: string;
  payload?: VaultPayQRPayload;
}

/**
 * Generates an official VaultPay payment URI string.
 * Strictly sanitizes parameters so that no sensitive data is included.
 */
export function generateVaultPayQRString(params: {
  vpa: string;
  name: string;
  amount?: number;
  note?: string;
}): string {
  const cleanVpa = params.vpa.trim().toLowerCase();
  const cleanName = params.name.trim();

  // Build standard custom URI scheme
  const searchParams = new URLSearchParams();
  searchParams.set('vpa', cleanVpa);
  searchParams.set('name', cleanName);

  if (params.amount && !isNaN(params.amount) && params.amount > 0) {
    searchParams.set('amount', params.amount.toFixed(2));
  }

  if (params.note && params.note.trim()) {
    searchParams.set('note', params.note.trim().slice(0, 60));
  }

  searchParams.set('ts', Date.now().toString());

  return `vaultpay://pay?${searchParams.toString()}`;
}

/**
 * Parses and strictly verifies if scanned QR text is an official VaultPay payment code.
 * Non-VaultPay schemes or malformed URIs are explicitly rejected.
 */
export function parseVaultPayQRString(qrText: string): QRParseResult {
  if (!qrText || typeof qrText !== 'string') {
    return { isValid: false, error: 'Empty or invalid QR code content.' };
  }

  const trimmed = qrText.trim();

  let searchParams: URLSearchParams | null = null;

  if (trimmed.startsWith('vaultpay://pay?') || trimmed.startsWith('vaultpay://pay/')) {
    const queryPart = trimmed.includes('?') ? trimmed.split('?')[1] : '';
    searchParams = new URLSearchParams(queryPart);
  } else if (
    trimmed.startsWith('https://vaultpay.me/pay?') ||
    trimmed.startsWith('http://localhost:5173/pay?')
  ) {
    try {
      const url = new URL(trimmed);
      searchParams = url.searchParams;
    } catch {
      return { isValid: false, error: 'Malformed VaultPay payment URL.' };
    }
  } else {
    // Non-VaultPay QR code detected
    return {
      isValid: false,
      error:
        'Unsupported QR Code. VaultPay only processes official VaultPay payment QR codes (vaultpay://pay?vpa=...). Scanned content does not match the VaultPay specification.',
    };
  }

  const vpa = searchParams.get('vpa')?.trim().toLowerCase();
  const name = searchParams.get('name')?.trim() || 'VaultPay Recipient';
  const amountStr = searchParams.get('amount');
  const note = searchParams.get('note')?.trim() || undefined;
  const tsStr = searchParams.get('ts');

  if (!vpa) {
    return {
      isValid: false,
      error: 'Invalid QR Code: Recipient VaultPay ID is missing.',
    };
  }

  if (!isValidVaultPayId(vpa)) {
    return {
      isValid: false,
      error: `Invalid VaultPay ID in QR code: "${vpa}". Must follow username@vault or user@vp.`,
    };
  }

  let amount: number | undefined;
  if (amountStr) {
    amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      return {
        isValid: false,
        error: 'Invalid payment amount specified in QR code.',
      };
    }
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
}

/**
 * Helper to download an SVG element as a PNG image file
 */
export function downloadQRCodeAsPng(svgElementId: string, filename: string = 'vaultpay-qr.png'): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const svg = document.getElementById(svgElementId);
      if (!svg) {
        resolve(false);
        return;
      }

      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Set dimensions with border padding
        const padding = 40;
        canvas.width = img.width + padding * 2;
        canvas.height = img.height + padding * 2;

        if (ctx) {
          // White background
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, padding, padding);

          // Trigger download
          const a = document.createElement('a');
          a.download = filename;
          a.href = canvas.toDataURL('image/png');
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          resolve(true);
        } else {
          resolve(false);
        }
      };

      img.onerror = () => resolve(false);
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    } catch {
      resolve(false);
    }
  });
}
