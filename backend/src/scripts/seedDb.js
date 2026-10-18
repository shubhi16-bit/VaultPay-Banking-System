import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../');

async function seedDatabase() {
  logger.info('Seeding VaultPay MySQL Database with fictional banks, demo users, and transactions...');

  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    multipleStatements: true,
  });

  try {
    const seedFile = path.resolve(rootDir, 'database/seed.sql');
    if (!fs.existsSync(seedFile)) {
      throw new Error(`Seed file not found at ${seedFile}`);
    }

    const sql = fs.readFileSync(seedFile, 'utf8');
    await connection.query(sql);

    logger.info('Database seeded successfully with demo users, fictional banks, and sample accounts!');
  } catch (error) {
    logger.error('Failed to seed database:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seedDatabase();
