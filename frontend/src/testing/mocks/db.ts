import { factory, primaryKey } from '@mswjs/data';

import { createChatMessage, createUser } from '../data-generators';

/**
 * MSW Data factory for mock database
 * Provides in-memory persistence for mock API data
 */
export const db = factory({
  user: {
    id: primaryKey(Number),
    username: String,
    email: String,
    avatar: String,
    role: String,
    isActive: Boolean,
  },
  chatMessage: {
    id: primaryKey(String),
    content: String,
    userId: Number,
    createdAt: String,
  },
});

/**
 * Seed the database with initial mock data
 */
export function seedDb() {
  // Create test users
  const testUsers = [
    createUser({ id: 1, username: 'admin', role: 'admin' }),
    createUser({ id: 2, username: 'testuser', role: 'user' }),
    createUser({ id: 3, username: 'john_doe', role: 'user' }),
  ];

  testUsers.forEach((user) => {
    db.user.create({
      ...user,
      email: `${user.username}@example.com`,
    });
  });

  // Create test chat messages
  const testMessages = [
    createChatMessage({
      id: '1',
      userId: 1,
      content: 'Hello, how can I help you?',
    }),
    createChatMessage({
      id: '2',
      userId: 2,
      content: 'I need help with my account',
    }),
    createChatMessage({
      id: '3',
      userId: 1,
      content: 'Sure, what seems to be the problem?',
    }),
  ];

  testMessages.forEach((message) => {
    db.chatMessage.create(message);
  });
}

/**
 * Reset the database to initial state
 */
export function resetDb() {
  // Clear all data
  db.user.deleteMany({ where: {} });
  db.chatMessage.deleteMany({ where: {} });

  // Re-seed
  seedDb();
}
