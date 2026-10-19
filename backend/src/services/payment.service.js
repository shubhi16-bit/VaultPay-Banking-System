import crypto from 'crypto';
import { getConnection, query } from '../config/db.js';

export class PaymentService {
  /**
   * Add simulated demo money to the authenticated user's primary linked account
   */
  static async addDemoMoney(userId, { amount, note = 'Simulated demo deposit' }) {
    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      const error = new Error('Deposit amount must be a positive number.');
      error.statusCode = 400;
      error.isPublic = true;
      throw error;
    }

    if (depositAmount > 50000) {
      const error = new Error('Maximum simulated deposit per transaction is ₹50,000.00.');
      error.statusCode = 400;
      error.isPublic = true;
      throw error;
    }

    const conn = await getConnection();

    try {
      await conn.beginTransaction();

      // 1. Fetch and lock user's primary bank account
      const [accounts] = await conn.query(
        `SELECT ba.id, ba.account_number, ba.balance, ba.status, ba.currency,
                b.bank_name AS bankName, pp.vaultpay_id AS vaultpayId
         FROM bank_accounts ba
         JOIN banks b ON ba.bank_id = b.id
         LEFT JOIN payment_profiles pp ON pp.primary_account_id = ba.id
         WHERE ba.user_id = ? AND ba.is_primary = TRUE
         FOR UPDATE`,
        [userId]
      );

      if (accounts.length === 0) {
        const error = new Error('No linked primary bank account found. Please complete bank account linking first.');
        error.statusCode = 404;
        error.isPublic = true;
        throw error;
      }

      const account = accounts[0];

      if (account.status !== 'active') {
        const error = new Error(`Your bank account is currently ${account.status}. Deposits cannot be processed.`);
        error.statusCode = 400;
        error.isPublic = true;
        throw error;
      }

      const previousBalance = parseFloat(account.balance);
      const newBalance = parseFloat((previousBalance + depositAmount).toFixed(2));

      // 2. Update account balance
      await conn.query(
        'UPDATE bank_accounts SET balance = ? WHERE id = ?',
        [newBalance, account.id]
      );

      // 3. Create unique reference ID
      const referenceId = `TXN_DEP_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

      // 4. Insert master transaction
      const [txResult] = await conn.query(
        `INSERT INTO transactions (
          reference_id, sender_user_id, recipient_user_id,
          sender_account_id, recipient_account_id, type,
          amount, fee, status, note, created_at, completed_at
        ) VALUES (?, NULL, ?, NULL, ?, 'deposit', ?, 0.00, 'completed', ?, NOW(), NOW())`,
        [referenceId, userId, account.id, depositAmount, note]
      );

      const transactionId = txResult.insertId;

      // 5. Insert double-entry ledger entry (Credit to user's account)
      await conn.query(
        `INSERT INTO ledger_entries (
          transaction_id, account_id, entry_type, amount, balance_after, description
        ) VALUES (?, ?, 'credit', ?, ?, ?)`,
        [
          transactionId,
          account.id,
          depositAmount,
          newBalance,
          `Simulated demo deposit (Ref: ${referenceId})`,
        ]
      );

      // 6. Record Audit Log
      await conn.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, metadata)
         VALUES (?, 'DEMO_DEPOSIT_COMPLETED', 'transactions', ?, ?)`,
        [
          userId,
          referenceId,
          JSON.stringify({
            amount: depositAmount,
            previousBalance,
            newBalance,
            accountId: account.id,
            accountNumber: account.account_number,
          }),
        ]
      );

      await conn.commit();

      return {
        transactionId,
        referenceId,
        type: 'deposit',
        amount: depositAmount,
        currency: account.currency || 'INR',
        previousBalance,
        newBalance,
        status: 'completed',
        isSimulated: true,
        note,
        account: {
          accountId: account.id,
          accountNumber: account.account_number,
          bankName: account.bankName,
          vaultpayId: account.vaultpayId,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  /**
   * Transfer simulated funds atomically between two VaultPay accounts
   */
  static async transferMoney(senderUserId, { recipientVaultpayId, amount, note = 'VaultPay transfer', idempotencyKey = null }) {
    const transferAmount = parseFloat(amount);
    if (isNaN(transferAmount) || transferAmount <= 0) {
      const error = new Error('Transfer amount must be greater than zero.');
      error.statusCode = 400;
      error.isPublic = true;
      throw error;
    }

    const cleanRecipientVpa = recipientVaultpayId.trim().toLowerCase();
    const cleanIdempotencyKey = idempotencyKey ? idempotencyKey.trim() : null;

    // 1. Idempotency Check: Return previously processed result if identical request received
    if (cleanIdempotencyKey) {
      const [existingTx] = await query(
        `SELECT t.id, t.reference_id, t.amount, t.status, t.note, t.created_at,
                r_u.full_name AS recipientName, r_pp.vaultpay_id AS recipientVaultpayId,
                le.balance_after AS senderBalanceAfter
         FROM transactions t
         JOIN users r_u ON t.recipient_user_id = r_u.id
         JOIN payment_profiles r_pp ON r_u.id = r_pp.user_id
         LEFT JOIN ledger_entries le ON le.transaction_id = t.id AND le.entry_type = 'debit'
         WHERE t.idempotency_key = ? AND t.sender_user_id = ?
         LIMIT 1`,
        [cleanIdempotencyKey, senderUserId]
      );

      if (existingTx.length > 0) {
        const tx = existingTx[0];
        return {
          transactionId: tx.id,
          referenceId: tx.reference_id,
          amount: parseFloat(tx.amount),
          senderBalanceAfter: parseFloat(tx.senderBalanceAfter),
          status: tx.status,
          note: tx.note,
          isIdempotentReplay: true,
          recipient: {
            fullName: tx.recipientName,
            vaultpayId: tx.recipientVaultpayId,
          },
          timestamp: tx.created_at,
        };
      }
    }

    const conn = await getConnection();

    try {
      // 2. Call the enhanced stored procedure sp_execute_transfer
      await conn.query(
        `CALL sp_execute_transfer(?, ?, ?, ?, ?, @p_tx_id, @p_ref_id, @p_bal);`,
        [
          senderUserId,
          cleanRecipientVpa,
          transferAmount,
          note,
          cleanIdempotencyKey || null,
        ]
      );

      const [outResult] = await conn.query(
        'SELECT @p_tx_id AS transactionId, @p_ref_id AS referenceId, @p_bal AS senderBalanceAfter;'
      );

      const out = outResult[0];
      if (!out || !out.transactionId) {
        throw new Error('Transfer execution failed: No transaction record produced.');
      }

      // 3. Fetch recipient details for response
      const [recipientDetails] = await conn.query(
        `SELECT u.id, u.full_name AS fullName, pp.vaultpay_id AS vaultpayId, b.bank_name AS bankName
         FROM payment_profiles pp
         JOIN users u ON pp.user_id = u.id
         JOIN bank_accounts ba ON pp.primary_account_id = ba.id
         JOIN banks b ON ba.bank_id = b.id
         WHERE pp.vaultpay_id = ?
         LIMIT 1`,
        [cleanRecipientVpa]
      );

      const recipient = recipientDetails[0] || {
        fullName: 'VaultPay User',
        vaultpayId: cleanRecipientVpa,
        bankName: 'Partner Bank',
      };

      const responsePayload = {
        transactionId: out.transactionId,
        referenceId: out.referenceId,
        amount: transferAmount,
        currency: 'INR',
        senderBalanceAfter: parseFloat(out.senderBalanceAfter),
        status: 'completed',
        note,
        recipient: {
          fullName: recipient.fullName,
          vaultpayId: recipient.vaultpayId,
          bankName: recipient.bankName,
        },
        timestamp: new Date().toISOString(),
      };

      // 4. Save to idempotency_records table if key was provided
      if (cleanIdempotencyKey) {
        const keyHash = crypto.createHash('sha256').update(`${senderUserId}:${cleanIdempotencyKey}`).digest('hex');
        await conn.query(
          `INSERT INTO idempotency_records (key_hash, user_id, request_path, response_status, response_body, expires_at)
           VALUES (?, ?, '/api/transfers', 200, ?, NOW() + INTERVAL 24 HOUR)
           ON DUPLICATE KEY UPDATE response_body = VALUES(response_body)`,
          [keyHash, senderUserId, JSON.stringify(responsePayload)]
        );
      }

      return responsePayload;
    } catch (error) {
      // Re-throw with user-friendly messages for SQLSTATE 45000 signals
      throw error;
    } finally {
      conn.release();
    }
  }

  /**
   * Search registered users by VaultPay ID, Name, Phone or Email
   * Returns only safe public information for UI display
   */
  static async searchRecipients(currentUserId, queryStr) {
    const searchPattern = `%${queryStr.trim()}%`;

    const [recipients] = await query(
      `SELECT 
        u.id AS userId,
        u.full_name AS fullName,
        pp.vaultpay_id AS vaultpayId,
        b.bank_name AS bankName,
        b.bank_code AS bankCode,
        b.logo_url AS bankLogo
       FROM users u
       JOIN payment_profiles pp ON u.id = pp.user_id AND pp.status = 'active'
       JOIN bank_accounts ba ON pp.primary_account_id = ba.id AND ba.status = 'active'
       JOIN banks b ON ba.bank_id = b.id
       WHERE u.is_active = TRUE
         AND u.id != ?
         AND (
           pp.vaultpay_id LIKE ? OR
           u.full_name LIKE ? OR
           u.phone_number LIKE ?
         )
       ORDER BY 
         CASE WHEN pp.vaultpay_id = ? THEN 1
              WHEN pp.vaultpay_id LIKE ? THEN 2
              ELSE 3 END,
         u.full_name ASC
       LIMIT 10`,
      [
        currentUserId,
        searchPattern,
        searchPattern,
        searchPattern,
        queryStr.trim().toLowerCase(),
        `${queryStr.trim().toLowerCase()}%`,
      ]
    );

    return recipients;
  }

  /**
   * Retrieve recent payees (beneficiaries) for the authenticated user
   */
  static async getRecentPayees(currentUserId, limit = 8) {
    const safeLimit = Math.max(1, Math.min(20, parseInt(limit, 10) || 8));

    const [payees] = await query(
      `SELECT 
        b.id AS beneficiaryId,
        b.payee_user_id AS userId,
        u.full_name AS fullName,
        pp.vaultpay_id AS vaultpayId,
        bk.bank_name AS bankName,
        bk.bank_code AS bankCode,
        bk.logo_url AS bankLogo,
        b.last_transacted_at AS lastTransactedAt
       FROM beneficiaries b
       JOIN users u ON b.payee_user_id = u.id AND u.is_active = TRUE
       JOIN payment_profiles pp ON u.id = pp.user_id AND pp.status = 'active'
       LEFT JOIN bank_accounts ba ON pp.primary_account_id = ba.id
       LEFT JOIN banks bk ON ba.bank_id = bk.id
       WHERE b.user_id = ?
       ORDER BY b.last_transacted_at DESC
       LIMIT ?`,
      [currentUserId, safeLimit]
    );

    return payees;
  }
}
