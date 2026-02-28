import { http, HttpResponse } from 'msw';

import { db } from '../db';

import type { LoginRequest, RegisterRequest } from '@/api/models/req';
import type { AuthResponse } from '@/api/models/resp';

/**
 * Generate a mock JWT token
 */
function generateToken(userId: number): string {
  const payload = { userId, exp: Date.now() + 24 * 60 * 60 * 1000 };
  return btoa(JSON.stringify(payload));
}

export const authHandlers = [
  // POST /auth/login
  http.post('*/auth/login', async ({ request }) => {
    const body = (await request.json()) as LoginRequest;

    const user = db.user.findFirst({
      where: {
        username: {
          equals: body.username,
        },
      },
    });

    if (!user || body.password !== 'password123') {
      return HttpResponse.json(
        {
          code: 401,
          message: 'Invalid username or password',
          data: null,
        },
        { status: 401 },
      );
    }

    const token = generateToken(user.id);

    const response: AuthResponse = {
      user: {
        id: user.id,
        username: user.username,
        avatar: user.avatar || undefined,
        role: user.role || undefined,
        isActive: user.isActive,
      },
      token,
    };

    return HttpResponse.json({
      code: 200,
      message: 'Login successful',
      data: response,
    });
  }),

  // POST /auth/register
  http.post('*/auth/register', async ({ request }) => {
    const body = (await request.json()) as RegisterRequest;

    const existingUser = db.user.findFirst({
      where: {
        username: {
          equals: body.username,
        },
      },
    });

    if (existingUser) {
      return HttpResponse.json(
        {
          code: 400,
          message: 'Username already exists',
          data: null,
        },
        { status: 400 },
      );
    }

    const newUser = db.user.create({
      id: Date.now(),
      username: body.username,
      email: `${body.username}@example.com`,
      avatar: `https://i.pravatar.cc/150?u=${Date.now()}`,
      role: 'user',
      isActive: true,
    });

    const token = generateToken(newUser.id);

    const response: AuthResponse = {
      user: {
        id: newUser.id,
        username: newUser.username,
        avatar: newUser.avatar || undefined,
        role: newUser.role || undefined,
        isActive: newUser.isActive,
      },
      token,
    };

    return HttpResponse.json({
      code: 201,
      message: 'Registration successful',
      data: response,
    });
  }),

  // POST /auth/logout
  http.post('*/auth/logout', () => {
    return HttpResponse.json({
      code: 200,
      message: 'Logout successful',
      data: null,
    });
  }),
];
