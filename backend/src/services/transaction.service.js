import { query } from '../config/db.js';

export class TransactionService {
  /**
   * Retrieve paginated and filtered transaction history for the authenticated user
   */
  static async getTransactions(userId, filters = {}) {
    const page = Math.max(1, parseInt(filters.page, 10) || 1);
    const limit = Math.max(1, Math.min(50, parseInt(filters.limit, 10) || 10));
    const offset = (page - 1) * limit;

    const conditions = ['(t.sender_user_id = ? OR t.recipient_user_id = ?)'];
    const params = [userId, userId];

    // Filter by type (transfer, deposit, withdrawal)
    if (filters.type && filters.type !== 'all') {
      conditions.push('t.type = ?');
      params.push(filters.type);
    }

    // Filter by status (completed, pending, failed)
    if (filters.status && filters.status !== 'all') {
      conditions.push('t.status = ?');
      params.push(filters.status);
    }

    // Filter by flow (sent vs received)
    if (filters.flow === 'sent') {
      conditions.push('t.sender_user_id = ?');
      params.push(userId);
    } else if (filters.flow === 'received') {
      conditions.push('t.recipient_user_id = ?');
      params.push(userId);
    }

    // Filter by date range
    if (filters.startDate) {
      conditions.push('t.created_at >= ?');
      params.push(`${filters.startDate} 00:00:00`);
    }
    if (filters.endDate) {
      conditions.push('t.created_at <= ?');
      params.push(`${filters.endDate} 23:59:59`);
    }

    // Filter by search keyword (reference_id, note, or counterparty)
    if (filters.search && filters.search.trim()) {
      const searchPattern = `%${filters.search.trim()}%`;
      conditions.push(
        `(t.reference_id LIKE ? OR t.note LIKE ? OR s_u.full_name LIKE ? OR r_u.full_name LIKE ? OR s_pp.vaultpay_id LIKE ? OR r_pp.vaultpay_id LIKE ?)`
      );
      params.push(
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern,
        searchPattern
      );
    }

    const whereClause = conditions.join(' AND ');

    // 1. Count total matching records
    const countSql = `
      SELECT COUNT(*) AS total
      FROM transactions t
      LEFT JOIN users s_u ON t.sender_user_id = s_u.id
      LEFT JOIN payment_profiles s_pp ON s_u.id = s_pp.user_id
      LEFT JOIN users r_u ON t.recipient_user_id = r_u.id
      LEFT JOIN payment_profiles r_pp ON r_u.id = r_pp.user_id
      WHERE ${whereClause}
    `;

    const [countRows] = await query(countSql, params);
    const total = countRows[0].total;

    // 2. Fetch paginated records with counterparty details
    const selectSql = `
      SELECT 
        t.id AS transactionId,
        t.reference_id AS referenceId,
        t.type,
        t.amount,
        t.fee,
        t.status,
        t.note,
        t.created_at AS createdAt,
        t.completed_at AS completedAt,
        t.sender_user_id AS senderUserId,
        s_u.full_name AS senderName,
        s_pp.vaultpay_id AS senderVaultpayId,
        s_b.bank_name AS senderBankName,
        t.recipient_user_id AS recipientUserId,
        r_u.full_name AS recipientName,
        r_pp.vaultpay_id AS recipientVaultpayId,
        r_b.bank_name AS recipientBankName
      FROM transactions t
      LEFT JOIN users s_u ON t.sender_user_id = s_u.id
      LEFT JOIN payment_profiles s_pp ON s_u.id = s_pp.user_id
      LEFT JOIN bank_accounts s_ba ON t.sender_account_id = s_ba.id
      LEFT JOIN banks s_b ON s_ba.bank_id = s_b.id
      LEFT JOIN users r_u ON t.recipient_user_id = r_u.id
      LEFT JOIN payment_profiles r_pp ON r_u.id = r_pp.user_id
      LEFT JOIN bank_accounts r_ba ON t.recipient_account_id = r_ba.id
      LEFT JOIN banks r_b ON r_ba.bank_id = r_b.id
      WHERE ${whereClause}
      ORDER BY t.created_at DESC, t.id DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await query(selectSql, [...params, limit, offset]);

    // 3. Map records relative to authenticated user
    const items = rows.map(row => {
      const isSender = row.senderUserId === userId;
      const isDeposit = row.type === 'deposit';

      let flow = isSender ? 'debit' : 'credit';
      let counterparty;

      if (isDeposit) {
        counterparty = {
          fullName: 'VaultPay Simulated Treasury',
          vaultpayId: 'treasury@vaultpay',
          bankName: 'Simulated Central Reserve',
        };
      } else if (isSender) {
        counterparty = {
          fullName: row.recipientName || 'VaultPay User',
          vaultpayId: row.recipientVaultpayId || 'unknown@vaultpay',
          bankName: row.recipientBankName || 'Partner Bank',
        };
      } else {
        counterparty = {
          fullName: row.senderName || 'VaultPay User',
          vaultpayId: row.senderVaultpayId || 'unknown@vaultpay',
          bankName: row.senderBankName || 'Partner Bank',
        };
      }

      return {
        transactionId: row.transactionId,
        referenceId: row.referenceId,
        type: row.type,
        flow,
        amount: parseFloat(row.amount),
        fee: parseFloat(row.fee),
        currency: 'INR',
        status: row.status,
        note: row.note,
        counterparty,
        createdAt: row.createdAt,
        completedAt: row.completedAt,
      };
    });

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Retrieve single transaction receipt by numeric ID or reference ID
   * Enforces strict authorization (users can view only their own transactions)
   */
  static async getTransactionById(userId, identifier) {
    const isNumericId = /^\d+$/.test(identifier);
    const condition = isNumericId ? 't.id = ?' : 't.reference_id = ?';
    const param = isNumericId ? parseInt(identifier, 10) : identifier;

    const [rows] = await query(
      `SELECT 
        t.id AS transactionId,
        t.reference_id AS referenceId,
        t.idempotency_key AS idempotencyKey,
        t.type,
        t.amount,
        t.fee,
        t.status,
        t.note,
        t.failure_reason AS failureReason,
        t.created_at AS createdAt,
        t.completed_at AS completedAt,
        t.sender_user_id AS senderUserId,
        s_u.full_name AS senderName,
        s_pp.vaultpay_id AS senderVaultpayId,
        s_ba.account_number AS senderAccountNumber,
        s_b.bank_name AS senderBankName,
        t.recipient_user_id AS recipientUserId,
        r_u.full_name AS recipientName,
        r_pp.vaultpay_id AS recipientVaultpayId,
        r_ba.account_number AS recipientAccountNumber,
        r_b.bank_name AS recipientBankName
       FROM transactions t
       LEFT JOIN users s_u ON t.sender_user_id = s_u.id
       LEFT JOIN payment_profiles s_pp ON s_u.id = s_pp.user_id
       LEFT JOIN bank_accounts s_ba ON t.sender_account_id = s_ba.id
       LEFT JOIN banks s_b ON s_ba.bank_id = s_b.id
       LEFT JOIN users r_u ON t.recipient_user_id = r_u.id
       LEFT JOIN payment_profiles r_pp ON r_u.id = r_pp.user_id
       LEFT JOIN bank_accounts r_ba ON t.recipient_account_id = r_ba.id
       LEFT JOIN banks r_b ON r_ba.bank_id = r_b.id
       WHERE ${condition}`,
      [param]
    );

    if (rows.length === 0) {
      const error = new Error('Transaction not found.');
      error.statusCode = 404;
      error.isPublic = true;
      throw error;
    }

    const tx = rows[0];

    // Authorization Check: Must be sender or recipient
    if (tx.senderUserId !== userId && tx.recipientUserId !== userId) {
      const error = new Error('Access denied: You do not have permission to view this transaction.');
      error.statusCode = 403;
      error.isPublic = true;
      throw error;
    }

    // Fetch double-entry ledger records for this transaction
    const [ledgerRows] = await query(
      `SELECT 
        le.id AS entryId,
        le.account_id AS accountId,
        le.entry_type AS entryType,
        le.amount,
        le.balance_after AS balanceAfter,
        le.description,
        le.created_at AS createdAt
       FROM ledger_entries le
       JOIN bank_accounts ba ON le.account_id = ba.id
       WHERE le.transaction_id = ? AND ba.user_id = ?`,
      [tx.transactionId, userId]
    );

    const isSender = tx.senderUserId === userId;
    const isDeposit = tx.type === 'deposit';

    return {
      transactionId: tx.transactionId,
      referenceId: tx.referenceId,
      type: tx.type,
      flow: isSender ? 'debit' : 'credit',
      amount: parseFloat(tx.amount),
      fee: parseFloat(tx.fee),
      currency: 'INR',
      status: tx.status,
      note: tx.note,
      failureReason: tx.failureReason,
      createdAt: tx.createdAt,
      completedAt: tx.completedAt,
      sender: isDeposit
        ? {
            fullName: 'VaultPay Simulated Treasury',
            vaultpayId: 'treasury@vaultpay',
            bankName: 'Simulated Central Reserve',
          }
        : {
            fullName: tx.senderName,
            vaultpayId: tx.senderVaultpayId,
            bankName: tx.senderBankName,
            maskedAccountNumber: tx.senderAccountNumber
              ? `••••${tx.senderAccountNumber.slice(-4)}`
              : null,
          },
      recipient: {
        fullName: tx.recipientName,
        vaultpayId: tx.recipientVaultpayId,
        bankName: tx.recipientBankName,
        maskedAccountNumber: tx.recipientAccountNumber
          ? `••••${tx.recipientAccountNumber.slice(-4)}`
          : null,
      },
      ledgerEntries: ledgerRows.map(entry => ({
        entryId: entry.entryId,
        entryType: entry.entryType,
        amount: parseFloat(entry.amount),
        balanceAfter: parseFloat(entry.balanceAfter),
        description: entry.description,
        timestamp: entry.createdAt,
      })),
    };
  }
}
