import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import * as db from '../src/config/db.js';

describe('Bank Listing Endpoints', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/banks', () => {
    it('should return list of all active fictional banks', async () => {
      const mockBanks = [
        { id: 1, bankName: 'Apex National Bank', bankCode: 'APEX', ifscPrefix: 'APEX0001', logoUrl: null },
        { id: 2, bankName: 'Zenith Commerce Bank', bankCode: 'ZENITH', ifscPrefix: 'ZNTB0001', logoUrl: null },
      ];

      vi.spyOn(db, 'query').mockResolvedValueOnce([mockBanks]);

      const res = await request(app).get('/api/banks');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].bankCode).toBe('APEX');
    });
  });

  describe('GET /api/banks/:id', () => {
    it('should return details for valid bank ID', async () => {
      const mockBank = {
        id: 1,
        bankName: 'Apex National Bank',
        bankCode: 'APEX',
        ifscPrefix: 'APEX0001',
        logoUrl: null,
        isActive: 1,
      };

      vi.spyOn(db, 'query').mockResolvedValueOnce([[mockBank]]);

      const res = await request(app).get('/api/banks/1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bankName).toBe('Apex National Bank');
    });

    it('should return 404 for non-existent bank', async () => {
      vi.spyOn(db, 'query').mockResolvedValueOnce([[]]);

      const res = await request(app).get('/api/banks/999');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Bank not found');
    });

    it('should return 400 for invalid non-numeric ID parameter', async () => {
      const res = await request(app).get('/api/banks/invalid-id');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
