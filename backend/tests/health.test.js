import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import * as db from '../src/config/db.js';

describe('Health and System Endpoints', () => {
  it('GET / should return service info and documentation link', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.project).toContain('VaultPay');
  });

  it('GET /api/health should return health status when DB is connected', async () => {
    vi.spyOn(db, 'testDbConnection').mockResolvedValueOnce({ connected: true, result: 2 });

    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
    expect(res.body.data.database.connected).toBe(true);
  });

  it('GET /api/health should return 503 degraded status when DB is disconnected', async () => {
    vi.spyOn(db, 'testDbConnection').mockResolvedValueOnce({
      connected: false,
      error: 'ECONNREFUSED',
      code: 'ECONNREFUSED',
    });

    const res = await request(app).get('/api/health');
    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.data.status).toBe('degraded');
  });

  it('GET /api/nonexistent should return 404 with structured error', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Endpoint not found');
  });
});
