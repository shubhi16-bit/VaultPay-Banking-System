import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../');

async function runMigrationFile(connection, filePath) {
  const relativePath = path.relative(rootDir, filePath);
  logger.info(`Applying migration: ${relativePath}...`);
  const sql = fs.readFileSync(filePath, 'utf8');

  // Clean DELIMITER statements for mysql2 compatibility
  const cleanedSql = sql
    .replace(/DELIMITER\s+\$\$/gi, '')
    .replace(/DELIMITER\s+;/gi, '')
    .replace(/\$\$/g, ';');

  await connection.query(cleanedSql);
  logger.info(`Applied migration successfully: ${relativePath}`);
}

async function runMigrations() {
  logger.info('Starting VaultPay database migrations...');
  const migrationsDir = path.resolve(rootDir, 'database/migrations');

  if (!fs.existsSync(migrationsDir)) {
    logger.info('No migrations directory found. Skipping.');
    return;
  }

  const files = fs
    .readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    logger.info('No migration files found to apply.');
    return;
  }

  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    multipleStatements: true,
  });

  try {
    for (const file of files) {
      const fullPath = path.join(migrationsDir, file);
      await runMigrationFile(connection, fullPath);
    }
    logger.info('All database migrations applied successfully!');
  } catch (err) {
    logger.error('Migration failed:', err.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

runMigrations();
