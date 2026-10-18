import { query } from '../config/db.js';

export class BankService {
  /**
   * Get all active banks available for linking
   */
  static async getAllActiveBanks() {
    const [banks] = await query(
      `SELECT id, bank_name AS bankName, bank_code AS bankCode,
              ifsc_prefix AS ifscPrefix, logo_url AS logoUrl
       FROM banks
       WHERE is_active = TRUE
       ORDER BY bank_name ASC`
    );

    return banks;
  }

  /**
   * Get bank details by ID
   */
  static async getBankById(bankId) {
    const [rows] = await query(
      `SELECT id, bank_name AS bankName, bank_code AS bankCode,
              ifsc_prefix AS ifscPrefix, logo_url AS logoUrl, is_active AS isActive
       FROM banks
       WHERE id = ?`,
      [bankId]
    );

    if (rows.length === 0) {
      const error = new Error('Bank not found.');
      error.statusCode = 404;
      error.isPublic = true;
      throw error;
    }

    return rows[0];
  }
}
