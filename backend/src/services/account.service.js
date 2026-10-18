import { getConnection, query } from '../config/db.js';

export class AccountService {
  /**
   * Link a fictional bank account during onboarding
   */
  static async linkBankAccount(userId, { bankId, accountType = 'savings', initialBalance = 0.00 }) {
    const conn = await getConnection();

    try {
      await conn.beginTransaction();

      // 1. Verify user
      const [users] = await conn.query(
        'SELECT id, full_name, email, is_active FROM users WHERE id = ? FOR UPDATE',
        [userId]
      );

      if (users.length === 0 || !users[0].is_active) {
        const error = new Error('User not found or account is deactivated.');
        error.statusCode = 404;
        error.isPublic = true;
        throw error;
      }
      const user = users[0];

      // 2. Verify bank
      const [banks] = await conn.query(
        'SELECT id, bank_name, bank_code, ifsc_prefix, is_active FROM banks WHERE id = ?',
        [bankId]
      );

      if (banks.length === 0 || !banks[0].is_active) {
        const error = new Error('Selected bank does not exist or is currently inactive.');
        error.statusCode = 404;
        error.isPublic = true;
        throw error;
      }
      const bank = banks[0];

      // 3. Check duplicate linking for this bank
      const [existingBankLink] = await conn.query(
        'SELECT id FROM bank_accounts WHERE user_id = ? AND bank_id = ?',
        [userId, bankId]
      );

      if (existingBankLink.length > 0) {
        const error = new Error('You have already linked an account with this bank.');
        error.statusCode = 409;
        error.isPublic = true;
        throw error;
      }

      // 4. Check if user already has an existing primary account
      const [existingAccounts] = await conn.query(
        'SELECT id FROM bank_accounts WHERE user_id = ? AND is_primary = TRUE',
        [userId]
      );
      const isPrimary = existingAccounts.length === 0;

      // 5. Generate simulated 12-digit account number and IFSC
      // Example: Bank ID (2 digits) + timestamp slice (6 digits) + random (4 digits)
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const timeSlice = Date.now().toString().slice(-6);
      const bankPrefix = String(bank.id).padStart(2, '10');
      const accountNumber = `${bankPrefix}${timeSlice}${randomSuffix}`;
      const ifscCode = `${bank.ifsc_prefix}01`;

      const startingBalance = parseFloat(initialBalance) || 0.00;

      // 6. Insert into bank_accounts
      const [accountResult] = await conn.query(
        `INSERT INTO bank_accounts (
          user_id, bank_id, account_number, ifsc_code,
          account_type, balance, currency, is_primary, status
        ) VALUES (?, ?, ?, ?, ?, ?, 'INR', ?, 'active')`,
        [userId, bankId, accountNumber, ifscCode, accountType, startingBalance, isPrimary]
      );

      const accountId = accountResult.insertId;

      // 7. Resolve / Create VaultPay ID & QR payload
      // e.g. email prefix "shubhi" from "shubhi@gmail.com"
      let baseHandle = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_.]/g, '');
      if (!baseHandle || baseHandle.length < 2) {
        baseHandle = `user${userId}`;
      }
      let candidateVaultPayId = `${baseHandle}@vaultpay`;

      // Check if VaultPay ID is already taken by another user
      const [existingVpa] = await conn.query(
        'SELECT user_id FROM payment_profiles WHERE vaultpay_id = ? AND user_id != ?',
        [candidateVaultPayId, userId]
      );

      if (existingVpa.length > 0) {
        candidateVaultPayId = `${baseHandle}${userId}@vaultpay`;
      }

      const qrPayload = `vaultpay://pay?pa=${candidateVaultPayId}&pn=${encodeURIComponent(user.full_name)}&cu=INR`;

      // Insert or update payment_profile
      await conn.query(
        `INSERT INTO payment_profiles (user_id, primary_account_id, vaultpay_id, qr_code_payload, status)
         VALUES (?, ?, ?, ?, 'active')
         ON DUPLICATE KEY UPDATE
           primary_account_id = IF(? = TRUE, VALUES(primary_account_id), primary_account_id),
           status = 'active'`,
        [userId, accountId, candidateVaultPayId, qrPayload, isPrimary]
      );

      // 8. If initial balance is provided, record transaction & ledger entry
      if (startingBalance > 0) {
        const referenceId = `TXN_INIT_${Date.now()}_${Math.floor(100 + Math.random() * 900)}`;
        const [txResult] = await conn.query(
          `INSERT INTO transactions (
            reference_id, sender_user_id, recipient_user_id,
            sender_account_id, recipient_account_id, type,
            amount, fee, status, note, completed_at
          ) VALUES (?, NULL, ?, NULL, ?, 'deposit', ?, 0.00, 'completed', 'Initial account opening balance', NOW())`,
          [referenceId, userId, accountId, startingBalance]
        );

        const txId = txResult.insertId;

        await conn.query(
          `INSERT INTO ledger_entries (
            transaction_id, account_id, entry_type, amount, balance_after, description
          ) VALUES (?, ?, 'credit', ?, ?, ?)`,
          [txId, accountId, startingBalance, startingBalance, `Initial demo credit to account ${accountNumber}`]
        );
      }

      // 9. Audit log
      await conn.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata)
         VALUES (?, 'BANK_ACCOUNT_LINKED', 'bank_accounts', ?, ?)`,
        [
          userId,
          String(accountId),
          JSON.stringify({
            bankId,
            bankName: bank.bank_name,
            accountNumber,
            vaultpayId: candidateVaultPayId,
            initialBalance: startingBalance,
          }),
        ]
      );

      await conn.commit();

      return {
        accountId,
        accountNumber,
        ifscCode,
        accountType,
        balance: startingBalance,
        currency: 'INR',
        isPrimary,
        status: 'active',
        bank: {
          id: bank.id,
          bankName: bank.bank_name,
          bankCode: bank.bank_code,
        },
        paymentProfile: {
          vaultpayId: candidateVaultPayId,
          qrPayload,
        },
      };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  /**
   * Get user's primary linked account with balance
   */
  static async getPrimaryAccount(userId) {
    const [rows] = await query(
      `SELECT 
        ba.id AS accountId, ba.account_number AS accountNumber, ba.ifsc_code AS ifscCode,
        ba.account_type AS accountType, ba.balance, ba.currency, ba.status AS accountStatus,
        ba.is_primary AS isPrimary, ba.created_at AS linkedAt,
        b.id AS bankId, b.bank_name AS bankName, b.bank_code AS bankCode, b.logo_url AS bankLogo,
        pp.vaultpay_id AS vaultpayId, pp.qr_code_payload AS qrPayload
       FROM bank_accounts ba
       JOIN banks b ON ba.bank_id = b.id
       LEFT JOIN payment_profiles pp ON pp.user_id = ba.user_id
       WHERE ba.user_id = ? AND ba.is_primary = TRUE
       LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    return {
      accountId: row.accountId,
      accountNumber: row.accountNumber,
      ifscCode: row.ifscCode,
      accountType: row.accountType,
      balance: parseFloat(row.balance),
      currency: row.currency,
      status: row.accountStatus,
      isPrimary: Boolean(row.isPrimary),
      linkedAt: row.linkedAt,
      bank: {
        id: row.bankId,
        bankName: row.bankName,
        bankCode: row.bankCode,
        logoUrl: row.bankLogo,
      },
      paymentProfile: {
        vaultpayId: row.vaultpayId,
        qrPayload: row.qrPayload,
      },
    };
  }

  /**
   * Get all linked bank accounts for a user
   */
  static async getAllUserAccounts(userId) {
    const [accounts] = await query(
      `SELECT 
        ba.id AS accountId, ba.account_number AS accountNumber, ba.ifsc_code AS ifscCode,
        ba.account_type AS accountType, ba.balance, ba.currency, ba.status AS accountStatus,
        ba.is_primary AS isPrimary, ba.created_at AS linkedAt,
        b.id AS bankId, b.bank_name AS bankName, b.bank_code AS bankCode, b.logo_url AS bankLogo
       FROM bank_accounts ba
       JOIN banks b ON ba.bank_id = b.id
       WHERE ba.user_id = ?
       ORDER BY ba.is_primary DESC, ba.created_at ASC`,
      [userId]
    );

    return accounts.map(acc => ({
      ...acc,
      balance: parseFloat(acc.balance),
      isPrimary: Boolean(acc.isPrimary),
    }));
  }
}
