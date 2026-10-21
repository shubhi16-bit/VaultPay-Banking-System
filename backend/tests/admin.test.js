import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { setupTestDatabase } from './setupTestDb.js';
import { query, closeDbPool } from '../src/config/db.js';
import { env } from '../src/config/env.js';

describe('Admin Panel, Account Freezing, Audit Logs, and System Metrics', () => {
  let adminToken;
  let customerToken; // Rahul (Customer)
  let forgedAdminToken; // Token with role='admin' but DB user is customer

  beforeAll(async () => {
    await setupTestDatabase();

    // User 1: System Administrator (role: 'admin')
    adminToken = jwt.sign(
      { userId: 1, email: 'admin@vaultpay.com', role: 'admin' },
      env.JWT_SECRET
    );

    // User 2: Rahul Sharma (role: 'customer')
    customerToken = jwt.sign(
      { userId: 2, email: 'rahul.sharma@example.com', role: 'customer' },
      env.JWT_SECRET
    );

    // Forged Token: Claims role='admin' in payload, but user ID 2 in DB is 'customer'
    forgedAdminToken = jwt.sign(
      { userId: 2, email: 'rahul.sharma@example.com', role: 'admin' },
      env.JWT_SECRET
    );
  });

  afterAll(async () => {
    await closeDbPool();
  });

  describe('Admin Authorization Middleware (requireAdmin)', () => {
    it('should reject unauthenticated requests to admin endpoints with 401', async () => {
      const res = await request(app).get('/api/admin/users');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should deny non-admin customers with 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Administrator privileges required');
    });

    it('should reject forged client tokens claiming admin role by querying the database', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${forgedAdminToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Administrator privileges required');
    });

    it('should allow genuine administrators access to admin endpoints', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('User Management (GET /api/admin/users)', () => {
    it('should return paginated user list with linked accounts and balances', async () => {
      const res = await request(app)
        .get('/api/admin/users?page=1&limit=5')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data.pagination).toBeDefined();
      expect(res.body.data.pagination.page).toBe(1);

      // Verify user structure
      const rahul = res.body.data.items.find(u => u.email === 'rahul.sharma@example.com');
      expect(rahul).toBeDefined();
      expect(rahul.role).toBe('customer');
      expect(rahul.vaultpayId).toBe('rahul@vaultpay');
      expect(rahul.accounts.length).toBeGreaterThan(0);
      expect(rahul.accounts[0].accountNumber).toBeDefined();
      expect(rahul.accounts[0].balance).toBeGreaterThan(0);
      expect(rahul.accounts[0].status).toBe('active');

      // Crucial Security Verification: No sensitive credentials exposed
      expect(rahul.password_hash).toBeUndefined();
      expect(rahul.password).toBeUndefined();
    });

    it('should filter users by search term', async () => {
      const res = await request(app)
        .get('/api/admin/users?search=priya')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items.length).toBe(1);
      expect(res.body.data.items[0].email).toBe('priya.verma@example.com');
    });

    it('should filter users by role', async () => {
      const res = await request(app)
        .get('/api/admin/users?role=admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items.every(u => u.role === 'admin')).toBe(true);
    });
  });

  describe('Account Freezing & Unfreezing (PATCH /api/admin/accounts/:id/status)', () => {
    it('should reject non-admin request to update account status', async () => {
      const res = await request(app)
        .patch('/api/admin/accounts/1/status')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({ status: 'frozen', reason: 'Attempt by customer' });

      expect(res.status).toBe(403);
    });

    it('should reject status update without required reason', async () => {
      const res = await request(app)
        .patch('/api/admin/accounts/1/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'frozen' });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.errors.some(e => e.field === 'reason')).toBe(true);
    });

    it('should reject invalid status value', async () => {
      const res = await request(app)
        .patch('/api/admin/accounts/1/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'destroyed', reason: 'Invalid status testing' });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('should return 404 for non-existent bank account', async () => {
      const res = await request(app)
        .patch('/api/admin/accounts/999999/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'frozen', reason: 'Account does not exist' });

      expect(res.status).toBe(404);
      expect(res.body.message).toContain('Bank account not found');
    });

    it('should successfully freeze an active account with audit trail', async () => {
      // Account 2 belongs to Priya Verma (User 3)
      const freezeReason = 'Suspicious velocity of high-value transactions detected';
      const res = await request(app)
        .patch('/api/admin/accounts/2/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'frozen', reason: freezeReason });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accountId).toBe(2);
      expect(res.body.data.previousStatus).toBe('active');
      expect(res.body.data.status).toBe('frozen');
      expect(res.body.data.reason).toBe(freezeReason);
      expect(res.body.data.updatedBy.adminId).toBe(1);

      // Verify in DB that account is actually frozen
      const [acc] = await query('SELECT status FROM bank_accounts WHERE id = 2');
      expect(acc[0].status).toBe('frozen');

      // Verify single canonical audit log created by trigger with admin metadata
      const [logs] = await query(
        "SELECT * FROM audit_logs WHERE entity_type = 'bank_accounts' AND entity_id = '2' AND action = 'ACCOUNT_STATUS_FROZEN' ORDER BY id DESC LIMIT 1"
      );
      expect(logs.length).toBe(1);
      expect(logs[0].user_id).toBe(1); // Recorded admin ID
      const meta = typeof logs[0].metadata === 'string' ? JSON.parse(logs[0].metadata) : logs[0].metadata;
      expect(meta.reason).toBe(freezeReason);
      expect(meta.new_status).toBe('frozen');
    });

    it('should reject transfers where sender account is frozen', async () => {
      // Priya's account (Account 2) is now frozen. She cannot send money.
      const priyaToken = jwt.sign(
        { userId: 3, email: 'priya.verma@example.com', role: 'customer' },
        env.JWT_SECRET
      );

      const res = await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${priyaToken}`)
        .send({
          recipientVaultpayId: 'rahul@vaultpay',
          amount: 500,
          note: 'Attempt while frozen',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Sender bank account is frozen or inactive');
    });

    it('should reject transfers where recipient account is frozen', async () => {
      // Rahul (Account 1 active) attempts to send money to Priya (Account 2 frozen).
      const res = await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          recipientVaultpayId: 'priya@vaultpay',
          amount: 500,
          note: 'Sending to frozen recipient',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Recipient account is frozen or inactive');
    });

    it('should reject demo deposits into frozen account', async () => {
      const priyaToken = jwt.sign(
        { userId: 3, email: 'priya.verma@example.com', role: 'customer' },
        env.JWT_SECRET
      );

      const res = await request(app)
        .post('/api/accounts/deposit')
        .set('Authorization', `Bearer ${priyaToken}`)
        .send({
          amount: 1000,
          note: 'Deposit attempt to frozen account',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('bank account is currently frozen');
    });

    it('should successfully unfreeze account and restore payment capabilities', async () => {
      const unfreezeReason = 'Identity and KYC verified; false positive alert cleared';
      const res = await request(app)
        .patch('/api/admin/accounts/2/status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'active', reason: unfreezeReason });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('active');

      // Verify in DB that account is active again
      const [acc] = await query('SELECT status FROM bank_accounts WHERE id = 2');
      expect(acc[0].status).toBe('active');

      // Now transfer from Rahul to Priya should succeed
      const transferRes = await request(app)
        .post('/api/transfers')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          recipientVaultpayId: 'priya@vaultpay',
          amount: 100,
          note: 'Transfer after unfreezing',
        });

      expect(transferRes.status).toBe(200);
      expect(transferRes.body.success).toBe(true);
    });
  });

  describe('Audit Trail (GET /api/admin/audit-logs)', () => {
    it('should reject non-admin access to audit logs', async () => {
      const res = await request(app)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
    });

    it('should return paginated audit logs with actor and metadata details', async () => {
      const res = await request(app)
        .get('/api/admin/audit-logs?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data.items.length).toBeGreaterThan(0);

      const firstLog = res.body.data.items[0];
      expect(firstLog.id).toBeDefined();
      expect(firstLog.action).toBeDefined();
      expect(firstLog.entityType).toBeDefined();
      expect(firstLog.createdAt).toBeDefined();
      expect(firstLog.actor).toBeDefined();
    });

    it('should filter audit logs by action and entity type', async () => {
      const res = await request(app)
        .get('/api/admin/audit-logs?entityType=bank_accounts&action=ACCOUNT_STATUS')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.items.every(log => log.entityType === 'bank_accounts')).toBe(true);
      expect(res.body.data.items.every(log => log.action.includes('ACCOUNT_STATUS'))).toBe(true);
    });
  });

  describe('System Metrics & Financial Ledger Reconciliation (GET /api/admin/system/metrics)', () => {
    it('should reject non-admin access to system metrics', async () => {
      const res = await request(app)
        .get('/api/admin/system/metrics')
        .set('Authorization', `Bearer ${customerToken}`);

      expect(res.status).toBe(403);
    });

    it('should report comprehensive user, account, transaction stats and verify ledger reconciliation', async () => {
      const res = await request(app)
        .get('/api/admin/system/metrics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const data = res.body.data;
      expect(data.timestamp).toBeDefined();

      // Users stats
      expect(data.users.total).toBeGreaterThanOrEqual(5);
      expect(data.users.admins).toBeGreaterThanOrEqual(1);
      expect(data.users.customers).toBeGreaterThanOrEqual(4);

      // Accounts stats
      expect(data.accounts.total).toBeGreaterThanOrEqual(4);
      expect(data.accounts.totalCirculatingBalance).toBeGreaterThan(0);
      expect(data.accounts.currency).toBe('INR');

      // Transactions stats
      expect(data.transactions.total).toBeGreaterThan(0);
      expect(data.transactions.completed).toBeGreaterThan(0);
      expect(data.transactions.totalDepositVolume).toBeGreaterThan(0);

      // Double-Entry Ledger Parity & Reconciliation
      expect(data.ledgerReconciliation).toBeDefined();
      expect(data.ledgerReconciliation.auditedTransactionsCount).toBeGreaterThan(0);
      expect(data.ledgerReconciliation.discrepancyCount).toBe(0);
      expect(data.ledgerReconciliation.totalDiscrepancyAmount).toBe(0);
      expect(data.ledgerReconciliation.isDoubleEntryBalanced).toBe(true);
      expect(data.ledgerReconciliation.isLedgerBalanced).toBe(true);
      expect(typeof data.ledgerReconciliation.unbackedOpeningBalances).toBe('number');
    });
  });
});
