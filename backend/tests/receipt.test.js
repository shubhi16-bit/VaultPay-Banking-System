import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import { setupTestDatabase } from './setupTestDb.js';
import { closeDbPool } from '../src/config/db.js';
import { env } from '../src/config/env.js';

describe('Transaction Digital Receipts & PDF Export (GET /api/transactions/:id/receipt)', () => {
  let rahulToken;
  let priyaToken;
  let amitToken;

  beforeAll(async () => {
    await setupTestDatabase();

    // User 2: Rahul (Recipient of Tx 3)
    rahulToken = jwt.sign(
      { userId: 2, email: 'rahul.sharma@example.com', role: 'customer' },
      env.JWT_SECRET
    );

    // User 3: Priya (Sender of Tx 3)
    priyaToken = jwt.sign(
      { userId: 3, email: 'priya.verma@example.com', role: 'customer' },
      env.JWT_SECRET
    );

    // User 4: Amit (Third party, neither sender nor recipient of Tx 3)
    amitToken = jwt.sign(
      { userId: 4, email: 'amit.patel@example.com', role: 'customer' },
      env.JWT_SECRET
    );
  });

  afterAll(async () => {
    await closeDbPool();
  });

  it('should reject unauthenticated receipt request', async () => {
    const res = await request(app).get('/api/transactions/3/receipt');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should return 404 for nonexistent transaction ID', async () => {
    const res = await request(app)
      .get('/api/transactions/99999/receipt')
      .set('Authorization', `Bearer ${rahulToken}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Transaction not found');
  });

  it('should return 403 Forbidden when unauthorized user attempts to view another user receipt', async () => {
    // Transaction 3 is between Priya (sender) and Rahul (recipient). Amit has no permission.
    const res = await request(app)
      .get('/api/transactions/3/receipt')
      .set('Authorization', `Bearer ${amitToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Access denied');
  });

  it('should return complete JSON receipt to sender (Priya)', async () => {
    const res = await request(app)
      .get('/api/transactions/3/receipt')
      .set('Authorization', `Bearer ${priyaToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.referenceId).toBe('TXN_TRF_20261005_001');
    expect(res.body.data.receiptNumber).toBe('REC-TXN_TRF_20261005_001');
    expect(res.body.data.verificationHash).toHaveLength(32);
    expect(res.body.data.amount).toBe(2000);
    expect(res.body.data.flow).toBe('debit');
    expect(res.body.data.sender.fullName).toBe('Priya Verma');
    expect(res.body.data.recipient.fullName).toBe('Rahul Sharma');
    expect(res.body.data.sender.maskedAccountNumber).toMatch(/^••••\d{4}$/);
    expect(res.body.data.recipient.maskedAccountNumber).toMatch(/^••••\d{4}$/);
    expect(res.body.data.ledgerEntries.length).toBeGreaterThan(0);
  });

  it('should return complete JSON receipt to recipient (Rahul)', async () => {
    const res = await request(app)
      .get('/api/transactions/3/receipt')
      .set('Authorization', `Bearer ${rahulToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.flow).toBe('credit');
    expect(res.body.data.amount).toBe(2000);
  });

  it('should generate and stream a valid downloadable PDF receipt when format=pdf', async () => {
    const res = await request(app)
      .get('/api/transactions/3/receipt?format=pdf')
      .set('Authorization', `Bearer ${priyaToken}`)
      .buffer(true)
      .parse((res, callback) => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => callback(null, Buffer.concat(chunks)));
      });

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toContain('attachment; filename="vaultpay-receipt-TXN_TRF_20261005_001.pdf"');

    // Verify PDF binary signature (%PDF-)
    const pdfBuffer = res.body;
    expect(pdfBuffer.slice(0, 5).toString('ascii')).toBe('%PDF-');
    expect(pdfBuffer.length).toBeGreaterThan(1000); // Legitimate PDF content length
  });
});
