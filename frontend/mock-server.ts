#!/usr/bin/env node
/**
 * Standalone Mock API Server
 *
 * This server runs MSW handlers as a real HTTP server using Express.
 * Useful for:
 * - E2E testing with Playwright
 * - Manual testing without backend
 * - Development when backend is unavailable
 *
 * Usage:
 *   pnpm run-mock-server
 *   or
 *   node mock-server.ts
 */

import { createMiddleware } from '@mswjs/http-middleware';
import cors from 'cors';
import express from 'express';

import { seedDb } from './src/testing/mocks/db';
import { handlers } from './src/testing/mocks/handlers';

const app = express();
const PORT = process.env.VITE_APP_MOCK_API_PORT || 8080;

// Enable CORS for all origins (development only)
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Initialize mock database
seedDb();

// Apply MSW handlers as Express middleware
app.use(createMiddleware(...handlers));

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'Mock API server is running',
    timestamp: new Date().toISOString(),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 Mock API Server is running!

  Local:   http://localhost:${PORT}
  Health:  http://localhost:${PORT}/health

Available endpoints:
  POST   /auth/login
  POST   /auth/register
  POST   /auth/logout
  GET    /users/me
  GET    /users/:id
  GET    /users
  GET    /chat/messages
  POST   /chat/messages
  GET    /chat/messages/:id
  DELETE /chat/messages/:id

Test credentials:
  Username: admin / testuser / john_doe
  Password: password123
  `);
});
