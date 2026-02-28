import { setupServer } from 'msw/node';

import { db, seedDb } from './db';
import { handlers } from './handlers';

/**
 * MSW server instance for Node.js environment (tests)
 */
export const server = setupServer(...handlers);

/**
 * Initialize the mock server with seeded data
 */
export function initializeMockServer() {
  seedDb();
  server.listen({ onUnhandledRequest: 'warn' });
}

/**
 * Reset handlers and database between tests
 */
export function resetMockServer() {
  server.resetHandlers();
  db.user.deleteMany({ where: {} });
  db.chatMessage.deleteMany({ where: {} });
  seedDb();
}

/**
 * Close the mock server
 */
export function closeMockServer() {
  server.close();
}
