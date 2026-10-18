import app from './app.js';
import { env } from './config/env.js';
import { testDbConnection, closeDbPool } from './config/db.js';
import { logger } from './utils/logger.js';

async function startServer() {
  logger.info(`Starting VaultPay Banking Backend in [${env.NODE_ENV}] mode...`);

  // Verify Database Connection
  const dbHealth = await testDbConnection();
  if (dbHealth.connected) {
    logger.info(`Connected successfully to MySQL Database (${env.DB_NAME} at ${env.DB_HOST}:${env.DB_PORT})`);
  } else {
    logger.warn(
      `MySQL Database is not currently accessible at ${env.DB_HOST}:${env.DB_PORT} (${dbHealth.error || 'Connection refused'}).`
    );
    logger.warn('Please ensure MySQL 8 is running locally and credentials in backend/.env are configured.');
  }

  const server = app.listen(env.PORT, () => {
    logger.info(`VaultPay API Server is listening on http://localhost:${env.PORT}`);
    logger.info(`Health check available at http://localhost:${env.PORT}/api/health`);
  });

  // Graceful shutdown handling
  const shutdown = async (signal) => {
    logger.info(`Received ${signal}. Gracefully shutting down VaultPay server...`);
    server.close(async () => {
      logger.info('HTTP server closed.');
      await closeDbPool();
      logger.info('MySQL connection pool closed.');
      process.exit(0);
    });

    // Force shutdown after timeout
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((err) => {
  logger.error('Fatal error starting server:', err);
  process.exit(1);
});
