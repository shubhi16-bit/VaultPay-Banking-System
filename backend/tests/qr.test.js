import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { setupTestDatabase } from './setupTestDb.js';
import { query, closeDbPool } from '../src/config/db.js';
import { env } from '../src/config/env.js';

describe('QR Code Payments & Payee Resolution Endpoints', () => {
  let adminToken;
  let rahulToken;
  let priyaToken;

  beforeAll(async () => {
    await setupTestDatabase();

    // User 1: Admin (No linked bank account)
    adminToken = jwt.sign(
      { userId: 1, email: 'admin@vaultpay.com', role: 'admin' },
      env.JWT_SECRET
    );

    // User 2: Rahul Sharma (Linked account with Apex National Bank, rahul@vaultpay)
    rahulToken = jwt.sign(
      { userId: 2, email: 'rahul.sharma@example.com', role: 'customer' },
      env.JWT_SECRET
    );

    // User 3: Priya Verma (Linked account with Zenith Commerce Bank, priya@vaultpay)
    priyaToken = jwt.sign(
      { userId: 3, email: 'priya.verma@example.com', role: 'customer' },
      env.JWT_SECRET
    );
  });

  afterAll(async () => {
    await closeDbPool();
  });

  describe('GET /api/me/qr', () => {
    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/me/qr');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject request when user has no linked bank account', async () => {
      const res = await request(app)
        .get('/api/me/qr')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Please link a bank account');
    });

    it('should return valid QR payload, Base64 PNG data URL, and SVG for linked user', async () => {
      const res = await request(app)
        .get('/api/me/qr')
        .set('Authorization', `Bearer ${rahulToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.vaultpayId).toBe('rahul@vaultpay');
      expect(res.body.data.fullName).toBe('Rahul Sharma');
      expect(res.body.data.bankName).toBe('Apex National Bank');
      expect(res.body.data.accountNumber).toMatch(/^••••\d{4}$/);
      expect(res.body.data.qrPayload).toContain('vaultpay://pay?pa=rahul@vaultpay');
      expect(res.body.data.qrDataUrl).toMatch(/^data:image\/png;base64,/);
      expect(res.body.data.qrSvg).toContain('<svg');
    });

    it('should support /api/qr/my-code alias endpoint', async () => {
      const res = await request(app)
        .get('/api/qr/my-code')
        .set('Authorization', `Bearer ${rahulToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.vaultpayId).toBe('rahul@vaultpay');
      expect(res.body.data.qrPayload).toContain('vaultpay://pay?pa=rahul@vaultpay');
    });
  });

  describe('GET /api/payees/:vaultpayId', () => {
    it('should reject unauthenticated payee resolution', async () => {
      const res = await request(app).get('/api/payees/priya@vaultpay');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 404 for nonexistent payee VaultPay ID', async () => {
      const res = await request(app)
        .get('/api/payees/unknown_user@vaultpay')
        .set('Authorization', `Bearer ${rahulToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not found or account is inactive');
    });

    it('should resolve active eligible payee with safe masked details', async () => {
      const res = await request(app)
        .get('/api/payees/priya@vaultpay')
        .set('Authorization', `Bearer ${rahulToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.vaultpayId).toBe('priya@vaultpay');
      expect(res.body.data.fullName).toBe('Priya Verma');
      expect(res.body.data.bankName).toBe('Zenith Commerce Bank');
      expect(res.body.data.maskedAccountNumber).toMatch(/^••••\d{4}$/);
      expect(res.body.data.isEligible).toBe(true);
      expect(res.body.data.isSelf).toBe(false);
      expect(res.body.data.reason).toBeNull();
      // Ensure no private password or raw internal details leaked
      expect(res.body.data.password_hash).toBeUndefined();
      expect(res.body.data.balance).toBeUndefined();
    });

    it('should mark self-lookup as ineligible for transfers', async () => {
      const res = await request(app)
        .get('/api/payees/rahul@vaultpay')
        .set('Authorization', `Bearer ${rahulToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.vaultpayId).toBe('rahul@vaultpay');
      expect(res.body.data.isSelf).toBe(true);
      expect(res.body.data.isEligible).toBe(false);
      expect(res.body.data.reason).toContain('Self-transfers to your own account are not permitted');
    });

    it('should flag frozen payee bank account as ineligible', async () => {
      // Temporarily freeze user 4 (Amit)
      await query("UPDATE bank_accounts SET status = 'frozen' WHERE user_id = 4");

      try {
        const res = await request(app)
          .get('/api/payees/amit@vaultpay')
          .set('Authorization', `Bearer ${rahulToken}`);

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.vaultpayId).toBe('amit@vaultpay');
        expect(res.body.data.isEligible).toBe(false);
        expect(res.body.data.reason).toContain('Recipient account is frozen or inactive');
      } finally {
        // Restore Amit's account status
        await query("UPDATE bank_accounts SET status = 'active' WHERE user_id = 4");
      }
    });
  });

  describe('POST /api/qr/resolve', () => {
    it('should resolve payee from full QR code URI payload', async () => {
      const fullQrUri = 'vaultpay://pay?pa=priya@vaultpay&pn=Priya%20Verma&cu=INR';

      const res = await request(app)
        .post('/api/qr/resolve')
        .set('Authorization', `Bearer ${rahulToken}`)
        .send({ qrPayload: fullQrUri });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.vaultpayId).toBe('priya@vaultpay');
      expect(res.body.data.fullName).toBe('Priya Verma');
      expect(res.body.data.isEligible).toBe(true);
    });
  });
});
