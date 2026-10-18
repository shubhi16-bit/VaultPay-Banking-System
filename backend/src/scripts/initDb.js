import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mysql from 'mysql2/promise';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../../');

async function runSqlFile(connection, filePath) {
  const relativePath = path.relative(rootDir, filePath);
  logger.info(`Executing: ${relativePath}...`);
  const sql = fs.readFileSync(filePath, 'utf8');

  // Strip DELIMITER statements for mysql2 compatibility
  const cleanedSql = sql
    .replace(/DELIMITER\s+\$\$/gi, '')
    .replace(/DELIMITER\s+;/gi, '')
    .replace(/\$\$/g, ';');

  await connection.query(cleanedSql);
  logger.info(`Completed: ${relativePath}`);
}

async function initDatabase() {
  logger.info('Initializing VaultPay MySQL Database...');
  logger.info(`Target: ${env.DB_HOST}:${env.DB_PORT}, Database: ${env.DB_NAME}, User: ${env.DB_USER}`);

  // Create initial connection without specifying DB (to allow CREATE DATABASE)
  const connection = await mysql.createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    multipleStatements: true,
  });

  try {
    const filesToRun = [
      path.resolve(rootDir, 'database/schema.sql'),
      path.resolve(rootDir, 'database/views.sql'),
      path.resolve(rootDir, 'database/triggers.sql'),
      path.resolve(rootDir, 'database/procedures.sql'),
    ];

    for (const file of filesToRun) {
      if (fs.existsSync(file)) {
        await runSqlFile(connection, file);
      } else {
        logger.warn(`File not found: ${file}`);
      }
    }

    logger.info('Database schema, views, triggers, and procedures successfully initialized!');
  } catch (error) {
    logger.error('Failed to initialize database:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

initDatabase();
