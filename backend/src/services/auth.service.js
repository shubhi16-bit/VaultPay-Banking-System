import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../config/db.js';
import { env } from '../config/env.js';

export class AuthService {
  /**
   * Register a new user
   */
  static async registerUser({ fullName, email, password, phoneNumber }) {
    // 1. Check existing email
    const [existing] = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      const error = new Error('An account with this email address already exists.');
      error.statusCode = 409;
      error.isPublic = true;
      throw error;
    }

    // 2. Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // 3. Insert into database
    const [result] = await query(
      `INSERT INTO users (full_name, email, password_hash, phone_number, role, is_active)
       VALUES (?, ?, ?, ?, 'customer', TRUE)`,
      [fullName, email, passwordHash, phoneNumber || null]
    );

    const userId = result.insertId;

    // 4. Generate JWT
    const token = jwt.sign(
      { userId, email, role: 'customer' },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    return {
      user: {
        id: userId,
        fullName,
        email,
        phoneNumber: phoneNumber || null,
        role: 'customer',
        hasLinkedAccount: false,
      },
      token,
    };
  }

  /**
   * Authenticate user and issue JWT
   */
  static async loginUser({ email, password }) {
    // 1. Fetch user by email
    const [users] = await query(
      `SELECT id, full_name, email, password_hash, phone_number, role, is_active
       FROM users WHERE email = ?`,
      [email]
    );

    if (users.length === 0) {
      const error = new Error('Invalid email or password.');
      error.statusCode = 401;
      error.isPublic = true;
      throw error;
    }

    const user = users[0];

    if (!user.is_active) {
      const error = new Error('Your account has been deactivated. Please contact support.');
      error.statusCode = 403;
      error.isPublic = true;
      throw error;
    }

    // 2. Verify password hash
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      const error = new Error('Invalid email or password.');
      error.statusCode = 401;
      error.isPublic = true;
      throw error;
    }

    // 3. Check if user already linked a bank account
    const [accounts] = await query(
      `SELECT ba.id, ba.account_number, ba.status, pp.vaultpay_id
       FROM bank_accounts ba
       LEFT JOIN payment_profiles pp ON pp.user_id = ba.user_id
       WHERE ba.user_id = ? AND ba.is_primary = TRUE LIMIT 1`,
      [user.id]
    );

    const hasLinkedAccount = accounts.length > 0;
    const primaryAccount = hasLinkedAccount ? accounts[0] : null;

    // 4. Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN }
    );

    return {
      user: {
        id: user.id,
        fullName: user.full_name,
        email: user.email,
        phoneNumber: user.phone_number,
        role: user.role,
        hasLinkedAccount,
        vaultpayId: primaryAccount?.vaultpay_id || null,
      },
      token,
    };
  }

  /**
   * Get user profile details
   */
  static async getUserProfile(userId) {
    const [rows] = await query(
      `SELECT 
        u.id, u.full_name AS fullName, u.email, u.phone_number AS phoneNumber,
        u.role, u.is_active AS isActive, u.created_at AS createdAt,
        ba.id AS accountId, ba.account_number AS accountNumber, ba.balance,
        ba.currency, ba.status AS accountStatus,
        b.bank_name AS bankName, b.bank_code AS bankCode, b.logo_url AS bankLogo,
        pp.vaultpay_id AS vaultpayId, pp.qr_code_payload AS qrPayload
       FROM users u
       LEFT JOIN bank_accounts ba ON u.id = ba.user_id AND ba.is_primary = TRUE
       LEFT JOIN banks b ON ba.bank_id = b.id
       LEFT JOIN payment_profiles pp ON u.id = pp.user_id
       WHERE u.id = ?`,
      [userId]
    );

    if (rows.length === 0) {
      const error = new Error('User not found.');
      error.statusCode = 404;
      error.isPublic = true;
      throw error;
    }

    const row = rows[0];
    const hasLinkedAccount = !!row.accountId;

    return {
      id: row.id,
      fullName: row.fullName,
      email: row.email,
      phoneNumber: row.phoneNumber,
      role: row.role,
      isActive: Boolean(row.isActive),
      createdAt: row.createdAt,
      hasLinkedAccount,
      account: hasLinkedAccount
        ? {
            id: row.accountId,
            accountNumber: row.accountNumber,
            balance: parseFloat(row.balance),
            currency: row.currency,
            status: row.accountStatus,
            bankName: row.bankName,
            bankCode: row.bankCode,
            bankLogo: row.bankLogo,
            vaultpayId: row.vaultpayId,
            qrPayload: row.qrPayload,
          }
        : null,
    };
  }

  /**
   * Update basic profile info
   */
  static async updateUserProfile(userId, { fullName, phoneNumber }) {
    const updates = [];
    const params = [];

    if (fullName) {
      updates.push('full_name = ?');
      params.push(fullName);
    }
    if (phoneNumber !== undefined) {
      updates.push('phone_number = ?');
      params.push(phoneNumber || null);
    }

    if (updates.length === 0) {
      return await this.getUserProfile(userId);
    }

    params.push(userId);
    await query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

    return await this.getUserProfile(userId);
  }
}
