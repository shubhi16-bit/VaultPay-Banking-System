import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { setupTestDatabase } from './setupTestDb.js';
import { closeDbPool } from '../src/config/db.js';
import { env } from '../src/config/env.js';

describe('Recipient Search & Recent Payees (GET /api/users/*)', () => {
  let rahulToken;

  beforeAll(async () => {
    await setupTestDatabase();
    // User 2: Rahul Sharma
    rahulToken = jwt.sign(
      { userId: 2, email: 'rahul.sharma@example.com', role: 'customer' },
      env.JWT_SECRET
    );
  });

  afterAll(async () => {
    await closeDbPool();
  });

  describe('GET /api/users/search', () => {
    it('should reject unauthenticated search request', async () => {
      const res = await request(app).get('/api/users/search?q=priya');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject search without "q" query parameter', async () => {
      const res = await request(app)
        .get('/api/users/search')
        .set('Authorization', `Bearer ${rahulToken}`);

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
    });

    it('should find recipient by partial name or VaultPay ID without leaking sensitive data', async () => {
      const res = await request(app)
        .get('/api/users/search?q=priya')
        .set('Authorization', `Bearer ${rahulToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      const recipient = res.body.data[0];
      expect(recipient.vaultpayId).toBe('priya@vaultpay');
      expect(recipient.fullName).toBe('Priya Verma');
      expect(recipient.bankName).toBeDefined();

      // STRICT PRIVACY CHECK: Ensure NO private credentials or sensitive fields leak
      expect(recipient.password).toBeUndefined();
      expect(recipient.password_hash).toBeUndefined();
      expect(recipient.balance).toBeUndefined();
      expect(recipient.accountNumber).toBeUndefined();
    });

    it('should exclude the authenticated searching user from search results', async () => {
      const res = await request(app)
        .get('/api/users/search?q=rahul')
        .set('Authorization', `Bearer ${rahulToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      // Rahul should not appear in his own recipient search results
      expect(res.body.data.some(u => u.vaultpayId === 'rahul@vaultpay')).toBe(false);
    });
  });

  describe('GET /api/users/recent-payees', () => {
    it('should retrieve list of recent payees for home screen display', async () => {
      const res = await request(app)
        .get('/api/users/recent-payees')
        .set('Authorization', `Bearer ${rahulToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      // Seeded with recent payee priya@vaultpay
      expect(res.body.data.some(p => p.vaultpayId === 'priya@vaultpay')).toBe(true);
    });
  });
});
