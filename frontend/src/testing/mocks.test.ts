import { describe, expect, it } from 'vitest';

import { createChatMessage, createUser, db } from './mocks';

import { api } from '@/lib/api-client';

describe('Mock Server Infrastructure', () => {
  describe('Data Generators', () => {
    it('should generate a valid user', () => {
      const user = createUser();

      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('username');
      expect(user).toHaveProperty('avatar');
      expect(user).toHaveProperty('role');
      expect(user).toHaveProperty('isActive');
      expect(typeof user.id).toBe('number');
      expect(typeof user.username).toBe('string');
    });

    it('should generate a user with overrides', () => {
      const user = createUser({ username: 'testuser', role: 'admin' });

      expect(user.username).toBe('testuser');
      expect(user.role).toBe('admin');
    });

    it('should generate a valid chat message', () => {
      const message = createChatMessage();

      expect(message).toHaveProperty('id');
      expect(message).toHaveProperty('content');
      expect(message).toHaveProperty('userId');
      expect(message).toHaveProperty('createdAt');
      expect(typeof message.id).toBe('string');
      expect(typeof message.content).toBe('string');
      expect(typeof message.userId).toBe('number');
    });
  });

  describe('Mock Database', () => {
    it('should have seeded users', () => {
      const users = db.user.findMany({});
      expect(users.length).toBeGreaterThan(0);
    });

    it('should have seeded chat messages', () => {
      const messages = db.chatMessage.findMany({});
      expect(messages.length).toBeGreaterThan(0);
    });
  });

  describe('Auth Handlers', () => {
    it('should login with valid credentials', async () => {
      const response = await api.post('/auth/login', {
        username: 'admin',
        password: 'password123',
      });

      expect(response).toHaveProperty('user');
      expect(response).toHaveProperty('token');
      expect(response.user.username).toBe('admin');
    });

    it('should reject login with invalid credentials', async () => {
      await expect(
        api.post('/auth/login', {
          username: 'admin',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow();
    });

    it('should register a new user', async () => {
      const response = await api.post('/auth/register', {
        username: 'newuser',
        password: 'password123',
      });

      expect(response).toHaveProperty('user');
      expect(response).toHaveProperty('token');
      expect(response.user.username).toBe('newuser');
    });
  });

  describe('User Handlers', () => {
    it('should get current user with valid token', async () => {
      // First login to get a token
      const loginResponse = await api.post('/auth/login', {
        username: 'admin',
        password: 'password123',
      });

      // Set token in api client
      const response = await api.get('/users/me', {
        headers: {
          Authorization: `Bearer ${loginResponse.token}`,
        },
      });

      expect(response).toHaveProperty('id');
      expect(response).toHaveProperty('username');
      expect(response.username).toBe('admin');
    });

    it('should reject request without token', async () => {
      await expect(api.get('/users/me')).rejects.toThrow();
    });
  });

  describe('Chat Handlers', () => {
    it('should get all messages with valid token', async () => {
      // First login to get a token
      const loginResponse = await api.post('/auth/login', {
        username: 'admin',
        password: 'password123',
      });

      const response = await api.get('/chat/messages', {
        headers: {
          Authorization: `Bearer ${loginResponse.token}`,
        },
      });

      expect(Array.isArray(response)).toBe(true);
      expect(response.length).toBeGreaterThan(0);
    });

    it('should create a new message', async () => {
      // First login to get a token
      const loginResponse = await api.post('/auth/login', {
        username: 'admin',
        password: 'password123',
      });

      const response = await api.post(
        '/chat/messages',
        {
          content: 'Test message',
        },
        {
          headers: {
            Authorization: `Bearer ${loginResponse.token}`,
          },
        },
      );

      expect(response).toHaveProperty('id');
      expect(response).toHaveProperty('content');
      expect(response.content).toBe('Test message');
    });
  });
});
