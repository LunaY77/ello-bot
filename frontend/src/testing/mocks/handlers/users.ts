import { http, HttpResponse } from 'msw';

import { db } from '../db';

import type { UserInfoResponse } from '@/api/models/resp';

/**
 * Extract user ID from Authorization header
 */
function getUserIdFromAuth(request: Request): number | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(token));
    return payload.userId;
  } catch {
    return null;
  }
}

export const usersHandlers = [
  // GET /users/me - Get current user info
  http.get('*/users/me', ({ request }) => {
    const userId = getUserIdFromAuth(request);

    if (!userId) {
      return HttpResponse.json(
        {
          code: 401,
          message: 'Unauthorized',
          data: null,
        },
        { status: 401 },
      );
    }

    const user = db.user.findFirst({
      where: {
        id: {
          equals: userId,
        },
      },
    });

    if (!user) {
      return HttpResponse.json(
        {
          code: 404,
          message: 'User not found',
          data: null,
        },
        { status: 404 },
      );
    }

    const response: UserInfoResponse = {
      id: user.id,
      username: user.username,
      avatar: user.avatar || undefined,
      role: user.role || undefined,
      isActive: user.isActive,
    };

    return HttpResponse.json({
      code: 200,
      message: 'Success',
      data: response,
    });
  }),

  // GET /users/:id - Get user by ID
  http.get('*/users/:id', ({ params }) => {
    const userId = Number(params.id);

    const user = db.user.findFirst({
      where: {
        id: {
          equals: userId,
        },
      },
    });

    if (!user) {
      return HttpResponse.json(
        {
          code: 404,
          message: 'User not found',
          data: null,
        },
        { status: 404 },
      );
    }

    const response: UserInfoResponse = {
      id: user.id,
      username: user.username,
      avatar: user.avatar || undefined,
      role: user.role || undefined,
      isActive: user.isActive,
    };

    return HttpResponse.json({
      code: 200,
      message: 'Success',
      data: response,
    });
  }),

  // GET /users - Get all users
  http.get('*/users', () => {
    const users = db.user.findMany({});

    const response: UserInfoResponse[] = users.map((user) => ({
      id: user.id,
      username: user.username,
      avatar: user.avatar || undefined,
      role: user.role || undefined,
      isActive: user.isActive,
    }));

    return HttpResponse.json({
      code: 200,
      message: 'Success',
      data: response,
    });
  }),
];
