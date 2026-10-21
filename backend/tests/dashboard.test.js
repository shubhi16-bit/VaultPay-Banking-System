import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { setupTestDatabase } from './setupTestDb.js';
import { closeDbPool } from '../src/config/db.js';
import { env } from '../src/config/env.js';

describe('Dashboard Summary & Analytics Endpoints (GET /api/dashboard/*)', () => {
  let adminToken;
  let rahulToken;
  let priyaToken;

  beforeAll(async () => {
    await setupTestDatabase();

    // User 1: Admin (No linked bank account, zero transactions)
    adminToken = jwt.sign(
      { userId: 1, email: 'admin@vaultpay.com', role: 'admin' },
      env.JWT_SECRET
    );

    // User 2: Rahul Sharma (Deposit of ₹25,000 + Received ₹2,000 from Priya)
    rahulToken = jwt.sign(
      { userId: 2, email: 'rahul.sharma@example.com', role: 'customer' },
      env.JWT_SECRET
    );

    // User 3: Priya Verma (Deposit of ₹17,000 + Sent ₹2,000 to Rahul)
    priyaToken = jwt.sign(
      { userId: 3, email: 'priya.verma@example.com', role: 'customer' },
      env.JWT_SECRET
    );
  });

  afterAll(async () => {
    await closeDbPool();
  });

  describe('GET /api/dashboard/summary', () => {
    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/dashboard/summary');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return safe zeroed summary for fresh user without linked account', async () => {
      const res = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.balance).toBe(0);
      expect(res.body.data.currency).toBe('INR');
      expect(res.body.data.totalSent).toBe(0);
      expect(res.body.data.totalReceived).toBe(0);
      expect(res.body.data.totalDeposited).toBe(0);
      expect(res.body.data.transactionCount).toBe(0);
      expect(res.body.data.primaryAccount).toBeNull();
      expect(res.body.data.recentTransactions).toEqual([]);
    });

    it('should correctly calculate summary metrics and totals for active user (Rahul)', async () => {
      const res = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${rahulToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.balance).toBe(25000);
      expect(res.body.data.currency).toBe('INR');
      expect(res.body.data.totalSent).toBe(0);
      expect(res.body.data.totalReceived).toBe(2000);
      expect(res.body.data.totalDeposited).toBe(25000);
      expect(res.body.data.netCashFlow).toBe(27000); // 25000 + 2000 - 0
      expect(res.body.data.transactionCount).toBe(2);
      expect(res.body.data.primaryAccount).not.toBeNull();
      expect(res.body.data.primaryAccount.bankName).toBe('Apex National Bank');
      expect(res.body.data.primaryAccount.accountNumber).toMatch(/^••••\d{4}$/);
      expect(res.body.data.recentTransactions.length).toBe(2);
    });

    it('should isolate user financial metrics across accounts (Priya vs Rahul)', async () => {
      const resPriya = await request(app)
        .get('/api/dashboard/summary')
        .set('Authorization', `Bearer ${priyaToken}`);

      expect(resPriya.status).toBe(200);
      expect(resPriya.body.success).toBe(true);
      expect(resPriya.body.data.balance).toBe(15000);
      expect(resPriya.body.data.totalSent).toBe(2000); // Sent to Rahul
      expect(resPriya.body.data.totalReceived).toBe(0);
      expect(resPriya.body.data.totalDeposited).toBe(17000);
      expect(resPriya.body.data.netCashFlow).toBe(15000); // 17000 - 2000
    });
  });

  describe('GET /api/dashboard/analytics', () => {
    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/dashboard/analytics');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return valid time-series trends and categories for active user', async () => {
      const res = await request(app)
        .get('/api/dashboard/analytics')
        .set('Authorization', `Bearer ${priyaToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.period).toBe('6m');
      expect(res.body.data.summary).toBeDefined();
      expect(Array.isArray(res.body.data.monthlyTrends)).toBe(true);
      expect(Array.isArray(res.body.data.dailyTrends)).toBe(true);
      expect(Array.isArray(res.body.data.spendingCategories)).toBe(true);

      // Verify category breakdown for Priya (Sent transfer with note 'Dinner bill split')
      const categories = res.body.data.spendingCategories;
      expect(categories.length).toBeGreaterThan(0);
      const foodCategory = categories.find(c => c.category === 'Food & Dining');
      expect(foodCategory).toBeDefined();
      expect(foodCategory.amount).toBe(2000);
    });

    it('should accept configurable period filter', async () => {
      const res = await request(app)
        .get('/api/dashboard/analytics?period=1m&days=7')
        .set('Authorization', `Bearer ${rahulToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.period).toBe('1m');
      expect(res.body.data.periodDays).toBe(30);
      expect(res.body.data.dailyDays).toBe(7);
    });

    it('should reject invalid period query parameter', async () => {
      const res = await request(app)
        .get('/api/dashboard/analytics?period=invalid_period')
        .set('Authorization', `Bearer ${rahulToken}`);

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.errors.some(e => e.field === 'period')).toBe(true);
    });

    it('should handle user with zero transactions gracefully', async () => {
      const res = await request(app)
        .get('/api/dashboard/analytics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.monthlyTrends).toEqual([]);
      expect(res.body.data.dailyTrends).toEqual([]);
      expect(res.body.data.spendingCategories).toEqual([]);
    });
  });
});
