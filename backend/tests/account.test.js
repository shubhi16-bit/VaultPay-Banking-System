import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import * as db from '../src/config/db.js';
import { env } from '../src/config/env.js';

describe('Bank Account Linking & Management Endpoints', () => {
  const token = jwt.sign({ userId: 1, email: 'shubhi@example.com', role: 'customer' }, env.JWT_SECRET);
  const mockAuthUser = { id: 1, full_name: 'Shubhi Tech', email: 'shubhi@example.com', role: 'customer', is_active: 1 };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/accounts/link', () => {
    it('should reject unauthenticated request', async () => {
      const res = await request(app)
        .post('/api/accounts/link')
        .send({ bankId: 1 });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid payload without bankId', async () => {
      vi.spyOn(db, 'query').mockResolvedValueOnce([[mockAuthUser]]);

      const res = await request(app)
        .post('/api/accounts/link')
        .set('Authorization', `Bearer ${token}`)
        .send({});

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.errors.some(e => e.field === 'bankId')).toBe(true);
    });

    it('should successfully link a bank account during onboarding', async () => {
      // Mock auth middleware query
      vi.spyOn(db, 'query').mockResolvedValueOnce([[mockAuthUser]]);

      // Mock database transaction inside AccountService.linkBankAccount
      const mockConn = {
        beginTransaction: vi.fn().mockResolvedValue(),
        commit: vi.fn().mockResolvedValue(),
        rollback: vi.fn().mockResolvedValue(),
        release: vi.fn().mockResolvedValue(),
        query: vi
          .fn()
          // 1. SELECT user
          .mockResolvedValueOnce([[{ id: 1, full_name: 'Shubhi Tech', email: 'shubhi@example.com', is_active: 1 }]])
          // 2. SELECT bank
          .mockResolvedValueOnce([[{ id: 1, bank_name: 'Apex National Bank', bank_code: 'APEX', ifsc_prefix: 'APEX0001', is_active: 1 }]])
          // 3. check duplicate bank link
          .mockResolvedValueOnce([[]])
          // 4. check existing primary accounts
          .mockResolvedValueOnce([[]])
          // 5. INSERT bank_accounts
          .mockResolvedValueOnce([{ insertId: 101 }])
          // 6. check existing VPA
          .mockResolvedValueOnce([[]])
          // 7. INSERT payment_profiles
          .mockResolvedValueOnce([{ insertId: 5 }])
          // 8. INSERT audit_logs
          .mockResolvedValueOnce([{ insertId: 1 }]),
      };

      vi.spyOn(db, 'getConnection').mockResolvedValueOnce(mockConn);

      const res = await request(app)
        .post('/api/accounts/link')
        .set('Authorization', `Bearer ${token}`)
        .send({
          bankId: 1,
          accountType: 'savings',
          initialBalance: 0,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accountId).toBe(101);
      expect(res.body.data.accountNumber).toBeDefined();
      expect(res.body.data.paymentProfile.vaultpayId).toBe('shubhi@vaultpay');
      expect(res.body.data.bank.bankName).toBe('Apex National Bank');
      expect(mockConn.commit).toHaveBeenCalled();
      expect(mockConn.release).toHaveBeenCalled();
    });

    it('should reject if bank does not exist', async () => {
      vi.spyOn(db, 'query').mockResolvedValueOnce([[mockAuthUser]]);

      const mockConn = {
        beginTransaction: vi.fn().mockResolvedValue(),
        commit: vi.fn().mockResolvedValue(),
        rollback: vi.fn().mockResolvedValue(),
        release: vi.fn().mockResolvedValue(),
        query: vi
          .fn()
          .mockResolvedValueOnce([[{ id: 1, full_name: 'Shubhi Tech', email: 'shubhi@example.com', is_active: 1 }]])
          .mockResolvedValueOnce([[]]), // Bank not found
      };

      vi.spyOn(db, 'getConnection').mockResolvedValueOnce(mockConn);

      const res = await request(app)
        .post('/api/accounts/link')
        .set('Authorization', `Bearer ${token}`)
        .send({ bankId: 999 });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Selected bank does not exist');
      expect(mockConn.rollback).toHaveBeenCalled();
      expect(mockConn.release).toHaveBeenCalled();
    });

    it('should reject if bank account is already linked with the bank', async () => {
      vi.spyOn(db, 'query').mockResolvedValueOnce([[mockAuthUser]]);

      const mockConn = {
        beginTransaction: vi.fn().mockResolvedValue(),
        commit: vi.fn().mockResolvedValue(),
        rollback: vi.fn().mockResolvedValue(),
        release: vi.fn().mockResolvedValue(),
        query: vi
          .fn()
          .mockResolvedValueOnce([[{ id: 1, full_name: 'Shubhi Tech', email: 'shubhi@example.com', is_active: 1 }]])
          .mockResolvedValueOnce([[{ id: 1, bank_name: 'Apex National Bank', is_active: 1 }]])
          .mockResolvedValueOnce([[{ id: 88 }]]), // already linked!
      };

      vi.spyOn(db, 'getConnection').mockResolvedValueOnce(mockConn);

      const res = await request(app)
        .post('/api/accounts/link')
        .set('Authorization', `Bearer ${token}`)
        .send({ bankId: 1 });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already linked an account with this bank');
      expect(mockConn.rollback).toHaveBeenCalled();
    });
  });

  describe('GET /api/accounts/primary', () => {
    it('should return primary linked account details', async () => {
      vi.spyOn(db, 'query')
        .mockResolvedValueOnce([[mockAuthUser]]) // auth middleware
        .mockResolvedValueOnce([[
          {
            accountId: 101,
            accountNumber: '101234567890',
            ifscCode: 'APEX000101',
            accountType: 'savings',
            balance: '15000.50',
            currency: 'INR',
            accountStatus: 'active',
            isPrimary: 1,
            linkedAt: '2026-10-18T10:00:00Z',
            bankId: 1,
            bankName: 'Apex National Bank',
            bankCode: 'APEX',
            bankLogo: null,
            vaultpayId: 'shubhi@vaultpay',
            qrPayload: 'vaultpay://pay?pa=shubhi@vaultpay&pn=Shubhi%20Tech&cu=INR',
          },
        ]]);

      const res = await request(app)
        .get('/api/accounts/primary')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accountNumber).toBe('101234567890');
      expect(res.body.data.balance).toBe(15000.5);
      expect(res.body.data.paymentProfile.vaultpayId).toBe('shubhi@vaultpay');
    });

    it('should return 404 when user has not completed onboarding', async () => {
      vi.spyOn(db, 'query')
        .mockResolvedValueOnce([[mockAuthUser]]) // auth middleware
        .mockResolvedValueOnce([[]]); // no linked account

      const res = await request(app)
        .get('/api/accounts/primary')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Please complete bank onboarding');
    });
  });

  describe('GET /api/accounts/balance', () => {
    it('should return authoritative balance for primary account', async () => {
      vi.spyOn(db, 'query')
        .mockResolvedValueOnce([[mockAuthUser]]) // auth middleware
        .mockResolvedValueOnce([[
          {
            accountId: 101,
            accountNumber: '101234567890',
            balance: '25000.00',
            currency: 'INR',
            accountStatus: 'active',
            vaultpayId: 'shubhi@vaultpay',
          },
        ]]);

      const res = await request(app)
        .get('/api/accounts/balance')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.balance).toBe(25000);
      expect(res.body.data.currency).toBe('INR');
      expect(res.body.data.status).toBe('active');
    });
  });
});
