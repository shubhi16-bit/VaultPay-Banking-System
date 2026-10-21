import { AnalyticsService } from '../services/analytics.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

export class DashboardController {
  /**
   * Get dashboard summary (balance, totals, primary account, recent transactions)
   * GET /api/dashboard/summary
   */
  static async getSummary(req, res, next) {
    try {
      const summary = await AnalyticsService.getDashboardSummary(req.user.id);
      return ApiResponse.success(res, summary, 'Dashboard summary retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get dashboard analytics (monthly & daily cash flows, spending categories)
   * GET /api/dashboard/analytics
   */
  static async getAnalytics(req, res, next) {
    try {
      const analytics = await AnalyticsService.getDashboardAnalytics(req.user.id, req.query);
      return ApiResponse.success(res, analytics, 'Dashboard analytics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}
