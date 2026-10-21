import { query } from '../config/db.js';
import { TransactionService } from './transaction.service.js';

export class AnalyticsService {
  /**
   * Helper to convert period string into day count
   */
  static getPeriodDays(period) {
    switch (period) {
      case '1m':
        return 30;
      case '3m':
        return 90;
      case '1y':
        return 365;
      case '6m':
      default:
        return 180;
    }
  }

  /**
   * Heuristic categorization based on transaction type and note keywords
   */
  static categorizeTransaction(type, note = '') {
    const text = (note || '').toLowerCase();

    if (type === 'deposit') {
      return 'Demo Deposits';
    }
    if (text.includes('food') || text.includes('lunch') || text.includes('dinner') || text.includes('cafe') || text.includes('meal')) {
      return 'Food & Dining';
    }
    if (text.includes('rent') || text.includes('flat') || text.includes('room') || text.includes('house')) {
      return 'Rent & Housing';
    }
    if (text.includes('bill') || text.includes('recharge') || text.includes('electricity') || text.includes('wifi') || text.includes('gas')) {
      return 'Bills & Utilities';
    }
    if (text.includes('shop') || text.includes('buy') || text.includes('store') || text.includes('amazon') || text.includes('cloth')) {
      return 'Shopping';
    }
    if (text.includes('movie') || text.includes('ticket') || text.includes('game') || text.includes('trip') || text.includes('travel')) {
      return 'Entertainment & Travel';
    }
    return 'General Transfers';
  }

  /**
   * Retrieve high-level dashboard summary metrics
   * GET /api/dashboard/summary
   */
  static async getDashboardSummary(userId) {
    // 1. Fetch Primary Account & Authoritative Balance
    const [accountRows] = await query(
      `SELECT 
        ba.id AS accountId,
        ba.account_number AS accountNumber,
        ba.balance,
        ba.currency,
        ba.status,
        b.bank_name AS bankName,
        b.bank_code AS bankCode,
        b.logo_url AS bankLogo,
        pp.vaultpay_id AS vaultpayId
       FROM bank_accounts ba
       JOIN banks b ON ba.bank_id = b.id
       LEFT JOIN payment_profiles pp ON pp.user_id = ba.user_id
       WHERE ba.user_id = ? AND ba.is_primary = TRUE
       LIMIT 1`,
      [userId]
    );

    const primaryAccount = accountRows.length > 0 ? accountRows[0] : null;

    // 2. Aggregate Sent Transfers
    const [sentRows] = await query(
      `SELECT 
        COALESCE(SUM(amount), 0) AS totalSent,
        COUNT(*) AS sentCount
       FROM transactions
       WHERE sender_user_id = ? AND type = 'transfer' AND status = 'completed'`,
      [userId]
    );

    // 3. Aggregate Received Transfers
    const [receivedRows] = await query(
      `SELECT 
        COALESCE(SUM(amount), 0) AS totalReceived,
        COUNT(*) AS receivedCount
       FROM transactions
       WHERE recipient_user_id = ? AND type = 'transfer' AND status = 'completed'`,
      [userId]
    );

    // 4. Aggregate Demo Deposits
    const [depositRows] = await query(
      `SELECT 
        COALESCE(SUM(amount), 0) AS totalDeposited,
        COUNT(*) AS depositCount
       FROM transactions
       WHERE recipient_user_id = ? AND type = 'deposit' AND status = 'completed'`,
      [userId]
    );

    const totalSent = parseFloat(sentRows[0]?.totalSent || 0);
    const totalReceived = parseFloat(receivedRows[0]?.totalReceived || 0);
    const totalDeposited = parseFloat(depositRows[0]?.totalDeposited || 0);
    const sentCount = parseInt(sentRows[0]?.sentCount || 0, 10);
    const receivedCount = parseInt(receivedRows[0]?.receivedCount || 0, 10);
    const depositCount = parseInt(depositRows[0]?.depositCount || 0, 10);
    const totalTransactions = sentCount + receivedCount + depositCount;

    // 5. Recent 5 transactions
    const recentTxnsResult = await TransactionService.getTransactions(userId, { limit: 5 });

    return {
      balance: primaryAccount ? parseFloat(primaryAccount.balance) : 0.0,
      currency: 'INR',
      totalSent,
      totalReceived,
      totalDeposited,
      netCashFlow: totalReceived + totalDeposited - totalSent,
      transactionCount: totalTransactions,
      primaryAccount: primaryAccount
        ? {
            accountId: primaryAccount.accountId,
            accountNumber: `••••${primaryAccount.accountNumber.slice(-4)}`,
            bankName: primaryAccount.bankName,
            bankCode: primaryAccount.bankCode,
            bankLogo: primaryAccount.bankLogo,
            vaultpayId: primaryAccount.vaultpayId,
            status: primaryAccount.status,
          }
        : null,
      recentTransactions: recentTxnsResult.items || [],
    };
  }

  /**
   * Retrieve time-series analytics, cash-flow trends, and category distribution
   * GET /api/dashboard/analytics
   */
  static async getDashboardAnalytics(userId, options = {}) {
    const period = options.period || '6m';
    const periodDays = this.getPeriodDays(period);
    const dailyDays = Math.max(1, Math.min(90, parseInt(options.days, 10) || 30));

    // 1. Monthly cash flow points (Inflow vs Outflow)
    const [monthlyRows] = await query(
      `SELECT 
        DATE_FORMAT(completed_at, '%Y-%m') AS month,
        COALESCE(SUM(CASE WHEN recipient_user_id = ? THEN amount ELSE 0 END), 0) AS inflow,
        COALESCE(SUM(CASE WHEN sender_user_id = ? AND type = 'transfer' THEN amount ELSE 0 END), 0) AS outflow,
        COUNT(*) AS transactionCount
       FROM transactions
       WHERE (sender_user_id = ? OR recipient_user_id = ?)
         AND status = 'completed'
         AND completed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE_FORMAT(completed_at, '%Y-%m')
       ORDER BY month ASC`,
      [userId, userId, userId, userId, periodDays]
    );

    const monthlyTrends = monthlyRows.map(row => {
      const inflow = parseFloat(row.inflow);
      const outflow = parseFloat(row.outflow);
      return {
        month: row.month,
        inflow,
        outflow,
        net: inflow - outflow,
        transactionCount: parseInt(row.transactionCount, 10),
      };
    });

    // 2. Daily cash flow points for the last N days
    const [dailyRows] = await query(
      `SELECT 
        DATE_FORMAT(completed_at, '%Y-%m-%d') AS date,
        COALESCE(SUM(CASE WHEN recipient_user_id = ? THEN amount ELSE 0 END), 0) AS inflow,
        COALESCE(SUM(CASE WHEN sender_user_id = ? AND type = 'transfer' THEN amount ELSE 0 END), 0) AS outflow,
        COUNT(*) AS transactionCount
       FROM transactions
       WHERE (sender_user_id = ? OR recipient_user_id = ?)
         AND status = 'completed'
         AND completed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE_FORMAT(completed_at, '%Y-%m-%d')
       ORDER BY date ASC`,
      [userId, userId, userId, userId, dailyDays]
    );

    const dailyTrends = dailyRows.map(row => {
      const inflow = parseFloat(row.inflow);
      const outflow = parseFloat(row.outflow);
      return {
        date: row.date,
        inflow,
        outflow,
        net: inflow - outflow,
        transactionCount: parseInt(row.transactionCount, 10),
      };
    });

    // 3. Outflow Spending Breakdown by Category
    const [outflowRows] = await query(
      `SELECT 
        type,
        amount,
        note
       FROM transactions
       WHERE sender_user_id = ?
         AND type = 'transfer'
         AND status = 'completed'
         AND completed_at >= DATE_SUB(NOW(), INTERVAL ? DAY)`,
      [userId, periodDays]
    );

    const categoryMap = {};
    let totalOutflowPeriod = 0;

    for (const row of outflowRows) {
      const cat = this.categorizeTransaction(row.type, row.note);
      const amt = parseFloat(row.amount);
      totalOutflowPeriod += amt;

      if (!categoryMap[cat]) {
        categoryMap[cat] = { category: cat, amount: 0, count: 0 };
      }
      categoryMap[cat].amount += amt;
      categoryMap[cat].count += 1;
    }

    const spendingCategories = Object.values(categoryMap)
      .map(item => ({
        category: item.category,
        amount: parseFloat(item.amount.toFixed(2)),
        count: item.count,
        percentage: totalOutflowPeriod > 0
          ? parseFloat(((item.amount / totalOutflowPeriod) * 100).toFixed(1))
          : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return {
      period,
      periodDays,
      dailyDays,
      summary: {
        totalInflow: monthlyTrends.reduce((acc, m) => acc + m.inflow, 0),
        totalOutflow: monthlyTrends.reduce((acc, m) => acc + m.outflow, 0),
        netCashFlow:
          monthlyTrends.reduce((acc, m) => acc + m.inflow, 0) -
          monthlyTrends.reduce((acc, m) => acc + m.outflow, 0),
      },
      monthlyTrends,
      dailyTrends,
      spendingCategories,
    };
  }
}
