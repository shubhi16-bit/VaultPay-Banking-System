import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import * as db from '../src/config/db.js';
import { env } from '../src/config/env.js';

describe('Authentication & User Profile Endpoints', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should successfully register a new customer', async () => {
      // Mock db queries: 1. check existing email, 2. insert user
      vi.spyOn(db, 'query')
        .mockResolvedValueOnce([[]]) // No existing user
        .mockResolvedValueOnce([{ insertId: 42 }]); // Inserted ID

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'Test User',
          email: 'test.user@example.com',
          password: 'Password@123',
          phoneNumber: '+919876543210',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('test.user@example.com');
      expect(res.body.data.user.role).toBe('customer');
      expect(res.body.data.token).toBeDefined();
    });

    it('should reject registration if email already exists', async () => {
      vi.spyOn(db, 'query').mockResolvedValueOnce([[{ id: 1 }]]); // User exists

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'Duplicate User',
          email: 'duplicate@example.com',
          password: 'Password@123',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });

    it('should reject registration with weak password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'Test User',
          email: 'weakpass@example.com',
          password: 'simple', // No uppercase, no number, < 8 chars
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toBeDefined();
      expect(res.body.errors.some(e => e.field === 'password')).toBe(true);
    });

    it('should reject registration with invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          fullName: 'Test User',
          email: 'not-an-email',
          password: 'Password@123',
        });

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.errors.some(e => e.field === 'email')).toBe(true);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should successfully log in with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('Password@123', 10);
      const mockUser = {
        id: 10,
        full_name: 'Rahul Sharma',
        email: 'rahul@example.com',
        password_hash: hashedPassword,
        phone_number: '+919876543210',
        role: 'customer',
        is_active: 1,
      };

      vi.spyOn(db, 'query')
        .mockResolvedValueOnce([[mockUser]]) // find user by email
        .mockResolvedValueOnce([[{ id: 1, account_number: '100100234567', status: 'active', vaultpay_id: 'rahul@vaultpay' }]]); // check linked account

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'rahul@example.com',
          password: 'Password@123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('rahul@example.com');
      expect(res.body.data.user.hasLinkedAccount).toBe(true);
      expect(res.body.data.user.vaultpayId).toBe('rahul@vaultpay');
      expect(res.body.data.token).toBeDefined();
    });

    it('should reject login with wrong password', async () => {
      const hashedPassword = await bcrypt.hash('CorrectPassword@123', 10);
      const mockUser = {
        id: 10,
        full_name: 'Rahul Sharma',
        email: 'rahul@example.com',
        password_hash: hashedPassword,
        is_active: 1,
      };

      vi.spyOn(db, 'query').mockResolvedValueOnce([[mockUser]]);

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'rahul@example.com',
          password: 'WrongPassword@999',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid email or password');
    });

    it('should reject login for nonexistent user', async () => {
      vi.spyOn(db, 'query').mockResolvedValueOnce([[]]); // No user found

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password@123',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should reject request without Bearer token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return user profile when authenticated', async () => {
      const token = jwt.sign({ userId: 5, email: 'user@example.com', role: 'customer' }, env.JWT_SECRET);

      // Mock auth middleware query: user verification
      const mockUser = { id: 5, full_name: 'Test Auth', email: 'user@example.com', role: 'customer', is_active: 1 };
      // Mock profile query in AuthService.getUserProfile
      const mockProfileRow = {
        id: 5,
        fullName: 'Test Auth',
        email: 'user@example.com',
        phoneNumber: null,
        role: 'customer',
        isActive: 1,
        createdAt: '2026-10-18T12:00:00Z',
        accountId: 1,
        accountNumber: '100100998877',
        balance: '5000.00',
        currency: 'INR',
        accountStatus: 'active',
        bankName: 'Apex National Bank',
        bankCode: 'APEX',
        bankLogo: null,
        vaultpayId: 'testauth@vaultpay',
        qrPayload: 'vaultpay://pay?pa=testauth@vaultpay&pn=Test%20Auth&cu=INR',
      };

      vi.spyOn(db, 'query')
        .mockResolvedValueOnce([[mockUser]]) // auth middleware
        .mockResolvedValueOnce([[mockProfileRow]]); // getUserProfile

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('user@example.com');
      expect(res.body.data.hasLinkedAccount).toBe(true);
      expect(res.body.data.account.vaultpayId).toBe('testauth@vaultpay');
    });
  });
});
