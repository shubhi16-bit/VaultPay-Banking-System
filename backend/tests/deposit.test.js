import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { setupTestDatabase } from './setupTestDb.js';
import { query, closeDbPool } from '../src/config/db.js';
import { env } from '../src/config/env.js';

describe('Demo Money Deposit (POST /api/accounts/deposit)', () => {
  let rahulToken;

  beforeAll(async () => {
    await setupTestDatabase();
    // User 2: Rahul Sharma (seeded with primary account balance ₹25,000)
    rahulToken = jwt.sign(
      { userId: 2, email: 'rahul.sharma@example.com', role: 'customer' },
      env.JWT_SECRET
    );
  });

  afterAll(async () => {
    await closeDbPool();
  });

  it('should reject unauthenticated deposit request', async () => {
    const res = await request(app)
      .post('/api/accounts/deposit')
      .send({ amount: 1000 });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should reject non-positive deposit amount', async () => {
    const res = await request(app)
      .post('/api/accounts/deposit')
      .set('Authorization', `Bearer ${rahulToken}`)
      .send({ amount: -500 });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.errors.some(e => e.field === 'amount')).toBe(true);
  });

  it('should reject deposit exceeding single transaction limit of ₹50,000', async () => {
    const res = await request(app)
      .post('/api/accounts/deposit')
      .set('Authorization', `Bearer ${rahulToken}`)
      .send({ amount: 75000 });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.errors.some(e => e.field === 'amount')).toBe(true);
  });

  it('should successfully deposit demo money and update ledger and balance atomically', async () => {
    // Check initial balance before deposit
    const [beforeAccounts] = await query(
      'SELECT balance FROM bank_accounts WHERE user_id = 2 AND is_primary = TRUE'
    );
    const initialBalance = parseFloat(beforeAccounts[0].balance);

    const depositAmount = 5000.00;
    const res = await request(app)
      .post('/api/accounts/deposit')
      .set('Authorization', `Bearer ${rahulToken}`)
      .send({
        amount: depositAmount,
        note: 'Simulated salary credit',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.amount).toBe(depositAmount);
    expect(res.body.data.previousBalance).toBe(initialBalance);
    expect(res.body.data.newBalance).toBe(initialBalance + depositAmount);
    expect(res.body.data.isSimulated).toBe(true);
    expect(res.body.data.referenceId).toMatch(/^TXN_DEP_/);

    // Verify balance in database
    const [afterAccounts] = await query(
      'SELECT balance FROM bank_accounts WHERE user_id = 2 AND is_primary = TRUE'
    );
    expect(parseFloat(afterAccounts[0].balance)).toBe(initialBalance + depositAmount);

    // Verify ledger entry
    const [ledgers] = await query(
      'SELECT * FROM ledger_entries WHERE transaction_id = ?',
      [res.body.data.transactionId]
    );
    expect(ledgers.length).toBe(1);
    expect(ledgers[0].entry_type).toBe('credit');
    expect(parseFloat(ledgers[0].amount)).toBe(depositAmount);
    expect(parseFloat(ledgers[0].balance_after)).toBe(initialBalance + depositAmount);
  });
});
