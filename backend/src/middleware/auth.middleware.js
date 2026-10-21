import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { query } from '../config/db.js';

/**
 * Authenticate incoming HTTP request via Bearer JWT
 */
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return ApiResponse.error(res, 'Authentication required. Missing or malformed token.', 401);
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return ApiResponse.error(res, 'Authentication token missing.', 401);
    }

    const decoded = jwt.verify(token, env.JWT_SECRET);
    
    // Check if user still exists and is active in database
    const [users] = await query(
      'SELECT id, full_name, email, role, is_active FROM users WHERE id = ?',
      [decoded.userId || decoded.id]
    );

    if (users.length === 0) {
      return ApiResponse.error(res, 'User account no longer exists.', 401);
    }

    const user = users[0];
    if (!user.is_active) {
      return ApiResponse.error(res, 'Your user account has been deactivated.', 403);
    }

    // Attach verified user payload to request
    req.user = {
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return ApiResponse.error(res, 'Invalid or expired token. Please log in again.', 401);
    }
    next(error);
  }
}

/**
 * Role-Based Access Control middleware
 * @param  {...string} roles Allowed roles (e.g. 'admin', 'customer')
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.error(res, 'Authentication required.', 401);
    }

    if (!roles.includes(req.user.role)) {
      return ApiResponse.error(res, 'Access denied: Insufficient permissions.', 403);
    }

    next();
  };
}

/**
 * Strict Admin-Only Authorization Middleware
 * Verifies role directly from trusted database record; never trusts client-supplied claims
 */
export async function requireAdmin(req, res, next) {
  if (!req.user || !req.user.id) {
    return ApiResponse.error(res, 'Authentication required.', 401);
  }

  try {
    const [rows] = await query(
      'SELECT id, role, is_active FROM users WHERE id = ?',
      [req.user.id]
    );

    if (rows.length === 0 || !rows[0].is_active) {
      return ApiResponse.error(res, 'User account not found or deactivated.', 401);
    }

    if (rows[0].role !== 'admin') {
      return ApiResponse.error(res, 'Access denied. Administrator privileges required.', 403);
    }

    next();
  } catch (error) {
    next(error);
  }
}

