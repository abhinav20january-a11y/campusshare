
import './config/env.js';

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { rateLimit } from 'express-rate-limit';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

import { router } from './routes/index.js';
import { production } from './config/env.js';

import { demoPayments } from './routes/demoPayments.js';
import { razorpayRoutes } from './routes/razorpay.js';
import { paymentsRoutes } from './routes/payments.js';

export const app = express();

// Hide Express identification header.
app.disable('x-powered-by');

// ============================================
// ROUTE CONFIGURATION
// ============================================

router.use('/transactions', demoPayments);
router.use('/transactions', razorpayRoutes);
router.use('/payments', paymentsRoutes);

// ============================================
// CORS CONFIGURATION
// ============================================

const configuredOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map(origin => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

const localOrigins = production
  ? []
  : [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3001',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5174',
      'http://localhost:5175',
      'http://127.0.0.1:5175'
    ];

const origins = new Set([
  ...configuredOrigins,
  ...localOrigins
]);

// ============================================
// SECURITY HEADERS
// ============================================

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],

        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https://res.cloudinary.com'
        ],

        styleSrc: [
          "'self'",
          "'unsafe-inline'"
        ],

        scriptSrc: [
          "'self'",
          'https://checkout.razorpay.com'
        ],

        connectSrc: [
          "'self'",
          'https://api.razorpay.com',
          'https://lumberjack.razorpay.com'
        ],

        frameSrc: [
          "'self'",
          'https://api.razorpay.com',
          'https://checkout.razorpay.com'
        ],

        objectSrc: ["'none'"]
      }
    }
  })
);

// ============================================
// CORS MIDDLEWARE
// ============================================

app.use(
  cors({
    origin: (origin, callback) => {
      if (!production) {
        return callback(null, true);
      }

      if (!origin || origins.has(origin)) {
        return callback(null, true);
      }

      const error = new Error('Origin not permitted');
      error.status = 403;

      return callback(error);
    },
    credentials: true
  })
);

// ============================================
// ADDITIONAL ORIGIN VALIDATION
// ============================================

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (
    !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
    origin &&
    !origins.has(origin)
  ) {
    return res.status(403).json({
      success: false,
      message: 'Origin not permitted'
    });
  }

  next();
});

// ============================================
// GENERAL MIDDLEWARE
// ============================================

app.use(compression());

app.use(
  express.json({
    limit: '128kb'
  })
);

app.use(cookieParser());

// ============================================
// API ROUTES
// ============================================

app.use(
  '/api',
  rateLimit({
    windowMs: 60000,
    limit: 300,
    standardHeaders: 'draft-8',
    legacyHeaders: false
  }),
  router
);

app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found'
  });
});

// ============================================
// STATIC FILES
// ============================================

app.use(
  '/assets',
  express.static(
    fileURLToPath(
      new URL('../../public/assets', import.meta.url)
    ),
    {
      maxAge: '7d'
    }
  )
);

app.use(
  '/404',
  express.static(
    fileURLToPath(
      new URL('../../public/404', import.meta.url)
    )
  )
);

// ============================================
// FRONTEND BUILD
// ============================================

const client = fileURLToPath(
  new URL('../../client/dist', import.meta.url)
);

if (existsSync(client)) {
  app.use(express.static(client));

  app.get('/{*path}', (req, res) => {
    res.sendFile(client + '/index.html');
  });
}

// ============================================
// GLOBAL ERROR HANDLER
// ============================================

app.use((err, req, res, next) => {
  console.error(
    err.code || err.message
  );

  const status =
    err.status ||
    (err.code === 'LIMIT_FILE_SIZE' ? 400 : 500);

  res.status(status).json({
    success: false,
    message:
      status < 500
        ? err.message
        : 'The service could not complete your request. Please try again.'
  });
});
