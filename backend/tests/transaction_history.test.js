import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { setupTestDatabase } from './setupTestDb.js';
import { query, closeDbPool } from '../src/config/db.js';
import { env } from '../src/config/env.js';

describe('Transaction History & Receipts (GET /api/transactions/*)', () => {
  let rahulToken;
  let amitToken;

  beforeAll(async () => {
    await setupTestDatabase();
    // User 2: Rahul Sharma
    rahulToken = jwt.sign(
      { userId: 2, email: 'rahul.sharma@example.com', role: 'customer' },
      env.JWT_SECRET
    );
    // User 4: Amit Patel (Third-party user)
    amitToken = jwt.sign(
      { userId: 4, email: 'amit.patel@example.com', role: 'customer' },
      env.JWT_SECRET
    );
  });

  afterAll(async () => {
    await closeDbPool();
  });

  describe('GET /api/transactions', () => {
    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/transactions');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return paginated transaction history with flow and counterparty details', async () => {
      const res = await request(app)
        .get('/api/transactions?page=1&limit=5')
        .set('Authorization', `Bearer ${rahulToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data.pagination).toBeDefined();
      expect(res.body.data.pagination.page).toBe(1);
      expect(res.body.data.pagination.limit).toBe(5);

      if (res.body.data.items.length > 0) {
        const item = res.body.data.items[0];
        expect(item.referenceId).toBeDefined();
        expect(item.amount).toBeGreaterThan(0);
        expect(['debit', 'credit']).toContain(item.flow);
        expect(item.counterparty).toBeDefined();
        expect(item.counterparty.fullName).toBeDefined();
      }
    });

    it('should filter transactions by type "deposit"', async () => {
      const res = await request(app)
        .get('/api/transactions?type=deposit')
        .set('Authorization', `Bearer ${rahulToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items.every(i => i.type === 'deposit')).toBe(true);
    });

    it('should filter transactions by flow "sent"', async () => {
      const res = await request(app)
        .get('/api/transactions?flow=sent')
        .set('Authorization', `Bearer ${rahulToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items.every(i => i.flow === 'debit')).toBe(true);
    });
  });

  describe('GET /api/transactions/:id', () => {
    it('should return complete transaction receipt for participant', async () => {
      // Transaction 1 in seed is Rahul's welcome deposit
      const res = await request(app)
        .get('/api/transactions/1')
        .set('Authorization', `Bearer ${rahulToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.transactionId).toBe(1);
      expect(res.body.data.type).toBe('deposit');
      expect(res.body.data.sender).toBeDefined();
      expect(res.body.data.recipient).toBeDefined();
      expect(Array.isArray(res.body.data.ledgerEntries)).toBe(true);
    });

    it('should look up transaction by unique reference_id string as well', async () => {
      const res = await request(app)
        .get('/api/transactions/TXN_DEP_20261001_001')
        .set('Authorization', `Bearer ${rahulToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.referenceId).toBe('TXN_DEP_20261001_001');
    });

    it('should DENY access (403) when an unauthorized user attempts to view someone else transaction', async () => {
      // Transaction 1 is Rahul's deposit (User 2). Amit (User 4) was not involved!
      const res = await request(app)
        .get('/api/transactions/1')
        .set('Authorization', `Bearer ${amitToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Access denied');
    });

    it('should return 404 for nonexistent transaction', async () => {
      const res = await request(app)
        .get('/api/transactions/999999')
        .set('Authorization', `Bearer ${rahulToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
