import { QrService } from '../services/qr.service.js';
import { ApiResponse } from '../utils/apiResponse.js';

export class QrController {
  /**
   * Get authenticated user's QR code payload and image representations
   * GET /api/me/qr
   */
  static async getMyQrCode(req, res, next) {
    try {
      const qrData = await QrService.getUserQrCode(req.user.id);
      return ApiResponse.success(res, qrData, 'QR code retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Resolve a payee by VaultPay ID or QR payload
   * GET /api/payees/:vaultpayId
   * POST /api/qr/resolve
   */
  static async resolvePayee(req, res, next) {
    try {
      const identifier =
        req.params.vaultpayId ||
        req.body?.qrPayload ||
        req.body?.vaultpayId ||
        req.query?.qrPayload ||
        req.query?.vaultpayId;

      if (!identifier) {
        return ApiResponse.error(res, 'VaultPay ID or QR payload is required.', 400);
      }

      const payee = await QrService.resolvePayee(req.user.id, identifier);
      return ApiResponse.success(res, payee, 'Payee resolved successfully');
    } catch (error) {
      next(error);
    }
  }
}
