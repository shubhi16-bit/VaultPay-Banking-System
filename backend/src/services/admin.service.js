import { getConnection, query } from '../config/db.js';

export class AdminService {
  /**
   * Get paginated list of all users with linked accounts and balances
   * GET /api/admin/users
   */
  static async getUsers(filters = {}) {
    const page = Math.max(1, parseInt(filters.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(filters.limit, 10) || 10));
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];

    // Filter by role
    if (filters.role && filters.role !== 'all') {
      conditions.push('u.role = ?');
      params.push(filters.role);
    }

    // Filter by account status or user active
    if (filters.status && filters.status !== 'all') {
      if (filters.status === 'frozen') {
        conditions.push("ba.status = 'frozen'");
      } else if (filters.status === 'active') {
        conditions.push("u.is_active = TRUE AND (ba.status = 'active' OR ba.status IS NULL)");
      } else if (filters.status === 'closed') {
        conditions.push("ba.status = 'closed'");
      }
    }

    // Filter by search string
    if (filters.search && filters.search.trim()) {
      const searchPattern = `%${filters.search.trim()}%`;
      conditions.push(
        `(u.full_name LIKE ? OR u.email LIKE ? OR u.phone_number LIKE ? OR pp.vaultpay_id LIKE ? OR ba.account_number LIKE ?)`
      );
      params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 1. Total distinct users count
    const countSql = `
      SELECT COUNT(DISTINCT u.id) AS total
      FROM users u
      LEFT JOIN payment_profiles pp ON u.id = pp.user_id
      LEFT JOIN bank_accounts ba ON u.id = ba.user_id
      ${whereClause}
    `;

    const [countRows] = await query(countSql, params);
    const total = countRows[0]?.total || 0;

    if (total === 0) {
      return {
        items: [],
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 1,
        },
      };
    }

    // 2. Fetch distinct user IDs for this page
    const idsSql = `
      SELECT DISTINCT u.id
      FROM users u
      LEFT JOIN payment_profiles pp ON u.id = pp.user_id
      LEFT JOIN bank_accounts ba ON u.id = ba.user_id
      ${whereClause}
      ORDER BY u.id ASC
      LIMIT ? OFFSET ?
    `;

    const [idRows] = await query(idsSql, [...params, limit, offset]);
    const userIds = idRows.map(r => r.id);

    if (userIds.length === 0) {
      return {
        items: [],
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      };
    }

    // 3. Fetch detailed user & bank account info for selected IDs
    const usersSql = `
      SELECT 
        u.id AS userId,
        u.full_name AS fullName,
        u.email,
        u.phone_number AS phoneNumber,
        u.role,
        u.is_active AS isActive,
        u.created_at AS createdAt,
        pp.vaultpay_id AS vaultpayId,
        ba.id AS accountId,
        ba.account_number AS accountNumber,
        ba.account_type AS accountType,
        ba.balance,
        ba.currency,
        ba.is_primary AS isPrimary,
        ba.status AS accountStatus,
        b.id AS bankId,
        b.bank_name AS bankName,
        b.bank_code AS bankCode,
        b.logo_url AS bankLogo
      FROM users u
      LEFT JOIN payment_profiles pp ON u.id = pp.user_id
      LEFT JOIN bank_accounts ba ON u.id = ba.user_id
      LEFT JOIN banks b ON ba.bank_id = b.id
      WHERE u.id IN (${userIds.map(() => '?').join(',')})
      ORDER BY u.id ASC, ba.is_primary DESC, ba.id ASC
    `;

    const [rows] = await query(usersSql, userIds);

    // Group accounts per user
    const usersMap = new Map();

    for (const row of rows) {
      if (!usersMap.has(row.userId)) {
        usersMap.set(row.userId, {
          id: row.userId,
          fullName: row.fullName,
          email: row.email,
          phoneNumber: row.phoneNumber,
          role: row.role,
          isActive: Boolean(row.isActive),
          createdAt: row.createdAt,
          vaultpayId: row.vaultpayId || null,
          totalBalance: 0.0,
          accounts: [],
        });
      }

      if (row.accountId) {
        const user = usersMap.get(row.userId);
        const bal = parseFloat(row.balance);
        user.totalBalance = parseFloat((user.totalBalance + bal).toFixed(2));
        user.accounts.push({
          id: row.accountId,
          accountNumber: row.accountNumber,
          maskedAccountNumber: `••••${row.accountNumber.slice(-4)}`,
          accountType: row.accountType,
          balance: bal,
          currency: row.currency || 'INR',
          isPrimary: Boolean(row.isPrimary),
          status: row.accountStatus,
          bank: {
            id: row.bankId,
            bankName: row.bankName,
            bankCode: row.bankCode,
            logoUrl: row.bankLogo,
          },
        });
      }
    }

    return {
      items: Array.from(usersMap.values()),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Freeze or unfreeze an account with mandatory reason and automated audit logging
   * PATCH /api/admin/accounts/:id/status
   */
  static async updateAccountStatus(adminUser, accountId, { status: newStatus, reason }, clientIp = null) {
    const conn = await getConnection();

    try {
      await conn.beginTransaction();

      // 1. Fetch and lock target bank account
      const [accounts] = await conn.query(
        `SELECT ba.id, ba.user_id, ba.account_number, ba.status, ba.balance,
                u.full_name AS ownerName, u.email AS ownerEmail
         FROM bank_accounts ba
         JOIN users u ON ba.user_id = u.id
         WHERE ba.id = ?
         FOR UPDATE`,
        [accountId]
      );

      if (accounts.length === 0) {
        const error = new Error('Bank account not found.');
        error.statusCode = 404;
        error.isPublic = true;
        throw error;
      }

      const account = accounts[0];
      const previousStatus = account.status;

      // 2. Set MySQL session variables so trigger trg_audit_account_status_change
      // records the admin identity, timestamp, and reason canonically without duplicate records
      await conn.query('SET @admin_user_id = ?, @admin_reason = ?, @admin_ip = ?', [
        adminUser.id,
        reason,
        clientIp || null,
      ]);

      // 3. Update account status
      await conn.query('UPDATE bank_accounts SET status = ? WHERE id = ?', [
        newStatus,
        accountId,
      ]);

      // 4. Clear MySQL session variables
      await conn.query('SET @admin_user_id = NULL, @admin_reason = NULL, @admin_ip = NULL');

      await conn.commit();

      return {
        accountId: account.id,
        userId: account.user_id,
        accountNumber: account.account_number,
        ownerName: account.ownerName,
        ownerEmail: account.ownerEmail,
        previousStatus,
        status: newStatus,
        reason,
        updatedBy: {
          adminId: adminUser.id,
          adminEmail: adminUser.email,
        },
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  }

  /**
   * Retrieve system audit logs with pagination and filters
   * GET /api/admin/audit-logs
   */
  static async getAuditLogs(filters = {}) {
    const page = Math.max(1, parseInt(filters.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(filters.limit, 10) || 20));
    const offset = (page - 1) * limit;

    const conditions = [];
    const params = [];

    // Filter by action
    if (filters.action && filters.action.trim()) {
      conditions.push('al.action LIKE ?');
      params.push(`%${filters.action.trim()}%`);
    }

    // Filter by entity type
    if (filters.entityType && filters.entityType.trim()) {
      conditions.push('al.entity_type = ?');
      params.push(filters.entityType.trim());
    }

    // Filter by actor / user ID
    if (filters.userId) {
      conditions.push('al.user_id = ?');
      params.push(parseInt(filters.userId, 10));
    }

    // Date range filters
    if (filters.startDate) {
      conditions.push('al.created_at >= ?');
      params.push(`${filters.startDate} 00:00:00`);
    }
    if (filters.endDate) {
      conditions.push('al.created_at <= ?');
      params.push(`${filters.endDate} 23:59:59`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 1. Total count
    const [countRows] = await query(
      `SELECT COUNT(*) AS total FROM audit_logs al ${whereClause}`,
      params
    );
    const total = countRows[0]?.total || 0;

    // 2. Paginated rows with actor details
    const selectSql = `
      SELECT 
        al.id,
        al.user_id AS userId,
        al.action,
        al.entity_type AS entityType,
        al.entity_id AS entityId,
        al.ip_address AS ipAddress,
        al.user_agent AS userAgent,
        al.metadata,
        al.created_at AS createdAt,
        u.full_name AS actorName,
        u.email AS actorEmail,
        u.role AS actorRole
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ${whereClause}
      ORDER BY al.created_at DESC, al.id DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await query(selectSql, [...params, limit, offset]);

    const items = rows.map(row => {
      let metadata = row.metadata;
      if (typeof metadata === 'string') {
        try {
          metadata = JSON.parse(metadata);
        } catch {
          // Keep as string if parsing fails
        }
      }

      return {
        id: row.id,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        metadata,
        createdAt: row.createdAt,
        actor: row.userId
          ? {
              id: row.userId,
              fullName: row.actorName || 'User',
              email: row.actorEmail || 'unknown',
              role: row.actorRole || 'customer',
            }
          : {
              id: null,
              fullName: 'System Automation',
              email: 'system@vaultpay.internal',
              role: 'system',
            },
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
   * System financial metrics & double-entry ledger reconciliation
   * GET /api/admin/system/metrics
   */
  static async getSystemMetrics() {
    // 1. User stats
    const [userRows] = await query(
      `SELECT 
        COUNT(*) AS totalUsers,
        COALESCE(SUM(CASE WHEN role = 'customer' THEN 1 ELSE 0 END), 0) AS totalCustomers,
        COALESCE(SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END), 0) AS totalAdmins,
        COALESCE(SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END), 0) AS activeUsers
       FROM users`
    );
    const userStats = userRows[0];

    // 2. Account stats & circulating balance
    const [accountRows] = await query(
      `SELECT 
        COUNT(*) AS totalAccounts,
        COALESCE(SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END), 0) AS activeAccounts,
        COALESCE(SUM(CASE WHEN status = 'frozen' THEN 1 ELSE 0 END), 0) AS frozenAccounts,
        COALESCE(SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END), 0) AS closedAccounts,
        COALESCE(SUM(balance), 0) AS totalCirculatingBalance
       FROM bank_accounts`
    );
    const accountStats = accountRows[0];

    // 3. Transaction stats
    const [txRows] = await query(
      `SELECT 
        COUNT(*) AS totalTransactions,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) AS completedTransactions,
        COALESCE(SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END), 0) AS failedTransactions,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END), 0) AS pendingTransactions,
        COALESCE(SUM(CASE WHEN type = 'transfer' AND status = 'completed' THEN amount ELSE 0 END), 0) AS totalTransferVolume,
        COALESCE(SUM(CASE WHEN type = 'deposit' AND status = 'completed' THEN amount ELSE 0 END), 0) AS totalDepositVolume,
        COALESCE(SUM(CASE WHEN type = 'withdrawal' AND status = 'completed' THEN amount ELSE 0 END), 0) AS totalWithdrawalVolume
       FROM transactions`
    );
    const txStats = txRows[0];

    // 4. Double-Entry General Ledger reconciliation from vw_ledger_audit
    const [auditRows] = await query(
      `SELECT 
        COUNT(*) AS auditedTransactionsCount,
        COALESCE(SUM(CASE WHEN net_discrepancy != 0 THEN 1 ELSE 0 END), 0) AS discrepancyCount,
        COALESCE(SUM(ABS(net_discrepancy)), 0) AS totalDiscrepancyAmount,
        COALESCE(SUM(total_credit), 0) AS cumulativeCredits,
        COALESCE(SUM(total_debit), 0) AS cumulativeDebits
       FROM vw_ledger_audit`
    );
    const auditStats = auditRows[0];

    const totalCirculatingBalance = parseFloat(accountStats.totalCirculatingBalance);
    const totalDepositVolume = parseFloat(txStats.totalDepositVolume);
    const totalWithdrawalVolume = parseFloat(txStats.totalWithdrawalVolume);
    const netDepositInflow = totalDepositVolume - totalWithdrawalVolume;

    // Unbacked opening balances (pre-seeded account balances initialized prior to deposit transactions)
    const unbackedOpeningBalances = parseFloat(
      (totalCirculatingBalance - netDepositInflow).toFixed(2)
    );

    const discrepancyCount = parseInt(auditStats.discrepancyCount, 10);
    const totalDiscrepancyAmount = parseFloat(auditStats.totalDiscrepancyAmount);

    // Double-entry parity verified strictly from MySQL vw_ledger_audit view query
    const isDoubleEntryBalanced = discrepancyCount === 0;
    const isSystemFullyReconciled = isDoubleEntryBalanced && Math.abs(unbackedOpeningBalances) < 0.01;

    return {
      timestamp: new Date().toISOString(),
      users: {
        total: parseInt(userStats.totalUsers, 10),
        customers: parseInt(userStats.totalCustomers, 10),
        admins: parseInt(userStats.totalAdmins, 10),
        active: parseInt(userStats.activeUsers, 10),
      },
      accounts: {
        total: parseInt(accountStats.totalAccounts, 10),
        active: parseInt(accountStats.activeAccounts, 10),
        frozen: parseInt(accountStats.frozenAccounts, 10),
        closed: parseInt(accountStats.closedAccounts, 10),
        totalCirculatingBalance,
        currency: 'INR',
      },
      transactions: {
        total: parseInt(txStats.totalTransactions, 10),
        completed: parseInt(txStats.completedTransactions, 10),
        failed: parseInt(txStats.failedTransactions, 10),
        pending: parseInt(txStats.pendingTransactions, 10),
        totalTransferVolume: parseFloat(txStats.totalTransferVolume),
        totalDepositVolume,
        totalWithdrawalVolume,
        currency: 'INR',
      },
      ledgerReconciliation: {
        isLedgerBalanced: isDoubleEntryBalanced,
        isDoubleEntryBalanced,
        isSystemFullyReconciled,
        auditedTransactionsCount: parseInt(auditStats.auditedTransactionsCount, 10),
        discrepancyCount,
        totalDiscrepancyAmount,
        cumulativeCredits: parseFloat(auditStats.cumulativeCredits),
        cumulativeDebits: parseFloat(auditStats.cumulativeDebits),
        totalCirculatingBalance,
        netDepositInflow,
        unbackedOpeningBalances,
        calculationBasis:
          'Verified via MySQL vw_ledger_audit: zero-sum parity on transfers and balanced credit liability on deposits',
      },
    };
  }
}
