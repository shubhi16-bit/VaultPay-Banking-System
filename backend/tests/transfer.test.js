import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { setupTestDatabase } from './setupTestDb.js';
import { query, closeDbPool } from '../src/config/db.js';
import { env } from '../src/config/env.js';

describe('Money Transfers (POST /api/transfers)', () => {
  let rahulToken;
  let priyaToken;

  beforeAll(async () => {
    await setupTestDatabase();
    // User 2: Rahul Sharma (balance ₹25,000, rahul@vaultpay)
    rahulToken = jwt.sign(
      { userId: 2, email: 'rahul.sharma@example.com', role: 'customer' },
      env.JWT_SECRET
    );
    // User 3: Priya Verma (balance ₹15,000, priya@vaultpay)
    priyaToken = jwt.sign(
      { userId: 3, email: 'priya.verma@example.com', role: 'customer' },
      env.JWT_SECRET
    );
  });

  afterAll(async () => {
    await closeDbPool();
  });

  it('should reject unauthenticated transfer request', async () => {
    const res = await request(app)
      .post('/api/transfers')
      .send({
        recipientVaultpayId: 'priya@vaultpay',
        amount: 500,
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should successfully transfer funds between two accounts atomically', async () => {
    const [senderBefore] = await query('SELECT balance FROM bank_accounts WHERE user_id = 2');
    const [recipientBefore] = await query('SELECT balance FROM bank_accounts WHERE user_id = 3');

    const senderInitial = parseFloat(senderBefore[0].balance);
    const recipientInitial = parseFloat(recipientBefore[0].balance);
    const transferAmount = 2500.00;

    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${rahulToken}`)
      .send({
        recipientVaultpayId: 'priya@vaultpay',
        amount: transferAmount,
        note: 'Project contribution',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.amount).toBe(transferAmount);
    expect(res.body.data.status).toBe('completed');
    expect(res.body.data.senderBalanceAfter).toBe(senderInitial - transferAmount);
    expect(res.body.data.recipient.vaultpayId).toBe('priya@vaultpay');

    // Verify database balances updated atomically
    const [senderAfter] = await query('SELECT balance FROM bank_accounts WHERE user_id = 2');
    const [recipientAfter] = await query('SELECT balance FROM bank_accounts WHERE user_id = 3');

    expect(parseFloat(senderAfter[0].balance)).toBe(senderInitial - transferAmount);
    expect(parseFloat(recipientAfter[0].balance)).toBe(recipientInitial + transferAmount);

    // Verify balanced double-entry ledger records
    const [ledgers] = await query(
      'SELECT * FROM ledger_entries WHERE transaction_id = ? ORDER BY id ASC',
      [res.body.data.transactionId]
    );

    expect(ledgers.length).toBe(2);
    // Entry 1: Debit sender
    expect(ledgers[0].entry_type).toBe('debit');
    expect(parseFloat(ledgers[0].amount)).toBe(transferAmount);
    expect(parseFloat(ledgers[0].balance_after)).toBe(senderInitial - transferAmount);

    // Entry 2: Credit recipient
    expect(ledgers[1].entry_type).toBe('credit');
    expect(parseFloat(ledgers[1].amount)).toBe(transferAmount);
    expect(parseFloat(ledgers[1].balance_after)).toBe(recipientInitial + transferAmount);

    // Verify recent payee was recorded
    const [beneficiaries] = await query(
      'SELECT * FROM beneficiaries WHERE user_id = 2 AND payee_user_id = 3'
    );
    expect(beneficiaries.length).toBe(1);
    expect(beneficiaries[0].payee_vaultpay_id).toBe('priya@vaultpay');
  });

  it('should reject transfer when sender has insufficient balance', async () => {
    const [senderBefore] = await query('SELECT balance FROM bank_accounts WHERE user_id = 2');
    const balance = parseFloat(senderBefore[0].balance);

    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${rahulToken}`)
      .send({
        recipientVaultpayId: 'priya@vaultpay',
        amount: balance + 5000.00, // Exceeds balance but within Zod max limit of 100,000
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Insufficient balance');

    // Confirm sender balance did not change
    const [senderAfter] = await query('SELECT balance FROM bank_accounts WHERE user_id = 2');
    expect(parseFloat(senderAfter[0].balance)).toBe(balance);
  });

  it('should reject self-transfers to own account', async () => {
    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${rahulToken}`)
      .send({
        recipientVaultpayId: 'rahul@vaultpay',
        amount: 500,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Self-transfers');
  });

  it('should reject transfer to nonexistent recipient', async () => {
    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${rahulToken}`)
      .send({
        recipientVaultpayId: 'ghost.user@vaultpay',
        amount: 500,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Recipient VaultPay ID not found');
  });

  it('should reject transfer if recipient account is frozen', async () => {
    // Freeze Priya's account
    await query("UPDATE bank_accounts SET status = 'frozen' WHERE user_id = 3");

    const res = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${rahulToken}`)
      .send({
        recipientVaultpayId: 'priya@vaultpay',
        amount: 500,
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('frozen or inactive');

    // Unfreeze Priya's account for subsequent tests
    await query("UPDATE bank_accounts SET status = 'active' WHERE user_id = 3");
  });

  it('should handle idempotency key and prevent duplicate payments', async () => {
    const idempotencyKey = 'idemp_test_unique_key_999';
    const transferAmount = 300.00;

    // First request
    const firstRes = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${rahulToken}`)
      .send({
        recipientVaultpayId: 'priya@vaultpay',
        amount: transferAmount,
        note: 'Idempotency test payment',
        idempotencyKey,
      });

    expect(firstRes.status).toBe(200);
    expect(firstRes.body.success).toBe(true);
    const balanceAfterFirst = firstRes.body.data.senderBalanceAfter;

    // Second request with SAME idempotency key (simulating network retry)
    const secondRes = await request(app)
      .post('/api/transfers')
      .set('Authorization', `Bearer ${rahulToken}`)
      .send({
        recipientVaultpayId: 'priya@vaultpay',
        amount: transferAmount,
        note: 'Idempotency test payment',
        idempotencyKey,
      });

    expect(secondRes.status).toBe(200);
    expect(secondRes.body.success).toBe(true);
    // Confirms duplicate execution did NOT deduct funds a second time
    expect(secondRes.body.data.senderBalanceAfter).toBe(balanceAfterFirst);
    expect(secondRes.body.data.referenceId).toBe(firstRes.body.data.referenceId);
  });
});
