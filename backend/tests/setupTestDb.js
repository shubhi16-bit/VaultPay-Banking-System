import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import { env } from '../src/config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

export const TEST_DB_NAME = 'vaultpay_test_db';

export async function setupTestDatabase() {
  const adminConn = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    multipleStatements: true,
  });

  try {
    // 1. Ensure test database exists
    await adminConn.query(
      `CREATE DATABASE IF NOT EXISTS ${TEST_DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await adminConn.query(`USE ${TEST_DB_NAME};`);

    // Check if tables already exist
    const [existingTables] = await adminConn.query(
      `SHOW TABLES FROM ${TEST_DB_NAME};`
    );

    if (existingTables.length < 8) {
      // First time initialization: run schema, views, triggers, procedures, migrations
      const initFiles = [
        path.resolve(rootDir, 'database/schema.sql'),
        path.resolve(rootDir, 'database/views.sql'),
        path.resolve(rootDir, 'database/triggers.sql'),
        path.resolve(rootDir, 'database/procedures.sql'),
        path.resolve(rootDir, 'database/migrations/001_phase2_payment_enhancements.sql'),
      ];

      for (const file of initFiles) {
        if (fs.existsSync(file)) {
          let sql = fs.readFileSync(file, 'utf8');
          sql = sql.replace(/USE\s+vaultpay_db;/gi, `USE ${TEST_DB_NAME};`);
          const cleanedSql = sql
            .replace(/DELIMITER\s+\$\$/gi, '')
            .replace(/DELIMITER\s+;/gi, '')
            .replace(/\$\$/g, ';');
          await adminConn.query(cleanedSql);
        }
      }
    }

    // 2. Re-seed test database with clean starting state
    const cleanFiles = [
      path.resolve(rootDir, 'database/seed.sql'),
      path.resolve(rootDir, 'database/views.sql'),
    ];

    for (const file of cleanFiles) {
      if (fs.existsSync(file)) {
        let sql = fs.readFileSync(file, 'utf8');
        sql = sql.replace(/USE\s+vaultpay_db;/gi, `USE ${TEST_DB_NAME};`);
        const cleanedSql = sql
          .replace(/DELIMITER\s+\$\$/gi, '')
          .replace(/DELIMITER\s+;/gi, '')
          .replace(/\$\$/g, ';');
        await adminConn.query(cleanedSql);
      }
    }
  } finally {
    await adminConn.end();
  }
}
