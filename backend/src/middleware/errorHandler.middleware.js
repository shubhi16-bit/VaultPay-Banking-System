import { ZodError } from 'zod';
import { logger } from '../utils/logger.js';
import { ApiResponse } from '../utils/apiResponse.js';

export function errorHandler(err, req, res, next) {
  logger.error(`${req.method} ${req.originalUrl} - Error: ${err.message}`, err.stack);

  // 1. Zod Validation Errors
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return ApiResponse.error(res, 'Validation error', 422, formattedErrors);
  }

  // 2. MySQL Duplicate Entry (e.g., duplicate email, phone, account)
  if (err.code === 'ER_DUP_ENTRY') {
    let message = 'A record with these details already exists.';
    if (err.message.includes('users.email')) {
      message = 'An account with this email address already exists.';
    } else if (err.message.includes('users.phone_number')) {
      message = 'An account with this phone number already exists.';
    } else if (err.message.includes('uq_user_bank')) {
      message = 'You have already linked an account with this bank.';
    }
    return ApiResponse.error(res, message, 409);
  }

  // 3. MySQL Stored Procedure or Trigger SIGNAL (SQLSTATE 45000)
  if (err.sqlState === '45000') {
    return ApiResponse.error(res, err.message, 400);
  }

  // 4. JWT Errors
  if (err.name === 'JsonWebTokenError') {
    return ApiResponse.error(res, 'Invalid authentication token', 401);
  }
  if (err.name === 'TokenExpiredError') {
    return ApiResponse.error(res, 'Authentication token has expired. Please log in again.', 401);
  }

  // 5. Explicit HTTP Status on error object
  const statusCode = err.statusCode || err.status || 500;
  const message = err.isPublic ? err.message : (statusCode === 500 ? 'Internal server error' : err.message);

  return ApiResponse.error(res, message, statusCode);
}
