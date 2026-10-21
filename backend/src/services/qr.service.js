import QRCode from 'qrcode';
import { query } from '../config/db.js';

export class QrService {
  /**
   * Parse a raw identifier which may be a VaultPay ID or a QR payload string
   * e.g., "priya@vaultpay" or "vaultpay://pay?pa=priya@vaultpay&pn=Priya%20Verma&cu=INR"
   */
  static extractVaultpayId(rawInput) {
    if (!rawInput || typeof rawInput !== 'string') return '';
    const trimmed = rawInput.trim();

    if (trimmed.includes('pa=')) {
      try {
        const fakeUrl = new URL(trimmed.replace(/^vaultpay:\/\//i, 'https://vaultpay.local/'));
        const pa = fakeUrl.searchParams.get('pa');
        if (pa) return pa.toLowerCase().trim();
      } catch {
        const match = trimmed.match(/[?&]pa=([^&]+)/);
        if (match) return decodeURIComponent(match[1]).toLowerCase().trim();
      }
    }

    return trimmed.toLowerCase();
  }

  /**
   * Retrieve or generate the authenticated user's QR code & payment identifiers
   */
  static async getUserQrCode(userId) {
    const [rows] = await query(
      `SELECT 
        u.id AS userId,
        u.full_name AS fullName,
        u.email,
        pp.vaultpay_id AS vaultpayId,
        pp.qr_code_payload AS qrPayload,
        pp.status AS profileStatus,
        ba.id AS accountId,
        ba.account_number AS accountNumber,
        ba.status AS accountStatus,
        b.bank_name AS bankName,
        b.bank_code AS bankCode,
        b.logo_url AS bankLogo
       FROM users u
       JOIN payment_profiles pp ON u.id = pp.user_id
       JOIN bank_accounts ba ON pp.primary_account_id = ba.id
       JOIN banks b ON ba.bank_id = b.id
       WHERE u.id = ? AND pp.status = 'active'
       LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) {
      const error = new Error('Please link a bank account before generating your VaultPay QR code.');
      error.statusCode = 400;
      error.isPublic = true;
      throw error;
    }

    const row = rows[0];

    // Ensure safe QR payload string
    const qrPayload =
      row.qrPayload ||
      `vaultpay://pay?pa=${encodeURIComponent(row.vaultpayId)}&pn=${encodeURIComponent(row.fullName)}&cu=INR`;

    // Render Base64 PNG data URL and SVG representations for high-fidelity frontend rendering
    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'M',
      margin: 2,
      scale: 8,
      color: {
        dark: '#1e293b', // Slate 800
        light: '#ffffff',
      },
    });

    const qrSvg = await QRCode.toString(qrPayload, {
      type: 'svg',
      margin: 2,
      color: {
        dark: '#1e293b',
        light: '#ffffff',
      },
    });

    return {
      userId: row.userId,
      fullName: row.fullName,
      vaultpayId: row.vaultpayId,
      accountNumber: `••••${row.accountNumber.slice(-4)}`,
      bankName: row.bankName,
      bankCode: row.bankCode,
      bankLogo: row.bankLogo,
      qrPayload,
      qrDataUrl,
      qrSvg,
    };
  }

  /**
   * Resolve a recipient by VaultPay ID or QR payload with server-side validation
   */
  static async resolvePayee(requesterUserId, rawIdentifier) {
    const vaultpayId = this.extractVaultpayId(rawIdentifier);

    if (!vaultpayId) {
      const error = new Error('Invalid VaultPay ID or QR payload.');
      error.statusCode = 400;
      error.isPublic = true;
      throw error;
    }

    const [rows] = await query(
      `SELECT 
        pp.vaultpay_id AS vaultpayId,
        pp.user_id AS payeeUserId,
        pp.status AS profileStatus,
        u.full_name AS fullName,
        u.is_active AS userIsActive,
        ba.id AS accountId,
        ba.account_number AS accountNumber,
        ba.status AS accountStatus,
        b.bank_name AS bankName,
        b.bank_code AS bankCode,
        b.logo_url AS bankLogo
       FROM payment_profiles pp
       JOIN users u ON pp.user_id = u.id
       JOIN bank_accounts ba ON pp.primary_account_id = ba.id
       JOIN banks b ON ba.bank_id = b.id
       WHERE pp.vaultpay_id = ?
       LIMIT 1`,
      [vaultpayId]
    );

    if (rows.length === 0 || !rows[0].userIsActive || rows[0].profileStatus !== 'active') {
      const error = new Error('Recipient VaultPay ID not found or account is inactive.');
      error.statusCode = 404;
      error.isPublic = true;
      throw error;
    }

    const payee = rows[0];
    const isSelf = payee.payeeUserId === requesterUserId;
    const isFrozen = payee.accountStatus !== 'active';

    let isEligible = true;
    let reason = null;

    if (isSelf) {
      isEligible = false;
      reason = 'Self-transfers to your own account are not permitted.';
    } else if (isFrozen) {
      isEligible = false;
      reason = 'Recipient account is frozen or inactive.';
    }

    return {
      vaultpayId: payee.vaultpayId,
      fullName: payee.fullName,
      bankName: payee.bankName,
      bankCode: payee.bankCode,
      bankLogo: payee.bankLogo,
      maskedAccountNumber: `••••${payee.accountNumber.slice(-4)}`,
      isEligible,
      isSelf,
      reason,
    };
  }
}
