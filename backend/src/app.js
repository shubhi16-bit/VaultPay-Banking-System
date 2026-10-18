import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import routes from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.middleware.js';
import { globalRateLimiter } from './middleware/rateLimiter.middleware.js';
import { ApiResponse } from './utils/apiResponse.js';

const app = express();

// Security Middlewares
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, Postman) or matching CLIENT_ORIGIN
      if (!origin || origin === env.CLIENT_ORIGIN || origin.startsWith('http://localhost:')) {
        callback(null, true);
      } else {
        callback(new Error('Blocked by CORS policy'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Idempotency-Key'],
  })
);

// Global Rate Limiter
app.use('/api', globalRateLimiter);

// Body Parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// HTTP Request Logging (disabled during tests)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Root route
app.get('/', (req, res) => {
  return ApiResponse.success(res, {
    project: 'VaultPay — Digital Banking & Transaction Management System',
    version: '1.0.0',
    documentation: '/docs/API_CONTRACT.md',
    healthCheck: '/api/health',
  });
});

// API Routes
app.use('/api', routes);

// 404 Route Not Found
app.use((req, res) => {
  return ApiResponse.error(res, `Endpoint not found: ${req.method} ${req.originalUrl}`, 404);
});

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
