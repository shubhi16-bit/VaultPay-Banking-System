import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { setupTestDatabase } from './setupTestDb.js';
import { query, closeDbPool } from '../src/config/db.js';
import { env } from '../src/config/env.js';

describe('Concurrent Transfers & Deterministic Locking', () => {
  let rahulToken;
  let priyaToken;

  beforeAll(async () => {
    await setupTestDatabase();
    // User 2: Rahul (₹25,000)
    rahulToken = jwt.sign(
      { userId: 2, email: 'rahul.sharma@example.com', role: 'customer' },
      env.JWT_SECRET
    );
    // User 3: Priya (₹15,000)
    priyaToken = jwt.sign(
      { userId: 3, email: 'priya.verma@example.com', role: 'customer' },
      env.JWT_SECRET
    );
  });

  afterAll(async () => {
    await closeDbPool();
  });

  it('should handle simultaneous bidirectional transfers without deadlocks or race conditions', async () => {
    // Record initial balances
    const [rahulBefore] = await query('SELECT balance FROM bank_accounts WHERE user_id = 2');
    const [priyaBefore] = await query('SELECT balance FROM bank_accounts WHERE user_id = 3');

    const rahulInit = parseFloat(rahulBefore[0].balance);
    const priyaInit = parseFloat(priyaBefore[0].balance);
    const totalBefore = rahulInit + priyaInit;

    // Concurrently trigger:
    // 3 transfers from Rahul -> Priya (₹100 each = ₹300)
    // 3 transfers from Priya -> Rahul (₹100 each = ₹300)
    const promises = [
      request(app).post('/api/transfers').set('Authorization', `Bearer ${rahulToken}`).send({ recipientVaultpayId: 'priya@vaultpay', amount: 100 }),
      request(app).post('/api/transfers').set('Authorization', `Bearer ${priyaToken}`).send({ recipientVaultpayId: 'rahul@vaultpay', amount: 100 }),
      request(app).post('/api/transfers').set('Authorization', `Bearer ${rahulToken}`).send({ recipientVaultpayId: 'priya@vaultpay', amount: 100 }),
      request(app).post('/api/transfers').set('Authorization', `Bearer ${priyaToken}`).send({ recipientVaultpayId: 'rahul@vaultpay', amount: 100 }),
      request(app).post('/api/transfers').set('Authorization', `Bearer ${rahulToken}`).send({ recipientVaultpayId: 'priya@vaultpay', amount: 100 }),
      request(app).post('/api/transfers').set('Authorization', `Bearer ${priyaToken}`).send({ recipientVaultpayId: 'rahul@vaultpay', amount: 100 }),
    ];

    const responses = await Promise.all(promises);

    // Verify all 6 concurrent requests succeeded with 200 OK (no deadlocks 1213 error)
    for (const res of responses) {
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    }

    // Verify system total conservation of money (zero money created or lost)
    const [rahulAfter] = await query('SELECT balance FROM bank_accounts WHERE user_id = 2');
    const [priyaAfter] = await query('SELECT balance FROM bank_accounts WHERE user_id = 3');

    const rahulFinal = parseFloat(rahulAfter[0].balance);
    const priyaFinal = parseFloat(priyaAfter[0].balance);
    const totalAfter = rahulFinal + priyaFinal;

    expect(totalAfter).toBe(totalBefore);

    // Double check ledger discrepancy view
    const [discrepancies] = await query(
      'SELECT * FROM vw_ledger_audit WHERE net_discrepancy <> 0.00'
    );
    expect(discrepancies.length).toBe(0);
  });
});
