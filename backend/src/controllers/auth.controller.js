import { AuthService } from '../services/auth.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

export class AuthController {
  /**
   * Register a new user
   * POST /api/auth/register
   */
  static async register(req, res, next) {
    try {
      const result = await AuthService.registerUser(req.body);
      return ApiResponse.created(res, result, 'User registration successful');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login user
   * POST /api/auth/login
   */
  static async login(req, res, next) {
    try {
      const result = await AuthService.loginUser(req.body);
      return ApiResponse.success(res, result, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get authenticated user profile & linked account status
   * GET /api/auth/me
   */
  static async getMe(req, res, next) {
    try {
      const profile = await AuthService.getUserProfile(req.user.id);
      return ApiResponse.success(res, profile, 'User profile retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update authenticated user profile
   * PUT /api/auth/profile
   */
  static async updateProfile(req, res, next) {
    try {
      const updated = await AuthService.updateUserProfile(req.user.id, req.body);
      return ApiResponse.success(res, updated, 'Profile updated successfully');
    } catch (error) {
      next(error);
    }
  }
}
