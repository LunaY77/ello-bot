import { http, HttpResponse } from 'msw';

import type { ChatMessage } from '../../data-generators';
import { db } from '../db';

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

export const chatHandlers = [
  // GET /chat/messages - Get all chat messages
  http.get('*/chat/messages', ({ request }) => {
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

    const messages = db.chatMessage.findMany({});

    const response: ChatMessage[] = messages.map((msg) => ({
      id: msg.id,
      content: msg.content,
      userId: msg.userId,
      createdAt: msg.createdAt,
    }));

    return HttpResponse.json({
      code: 200,
      message: 'Success',
      data: response,
    });
  }),

  // POST /chat/messages - Create a new chat message
  http.post('*/chat/messages', async ({ request }) => {
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

    const body = (await request.json()) as { content: string };

    if (!body.content || body.content.trim().length === 0) {
      return HttpResponse.json(
        {
          code: 400,
          message: 'Message content is required',
          data: null,
        },
        { status: 400 },
      );
    }

    const newMessage = db.chatMessage.create({
      id: `msg_${Date.now()}`,
      content: body.content,
      userId,
      createdAt: new Date().toISOString(),
    });

    const response: ChatMessage = {
      id: newMessage.id,
      content: newMessage.content,
      userId: newMessage.userId,
      createdAt: newMessage.createdAt,
    };

    return HttpResponse.json({
      code: 201,
      message: 'Message created',
      data: response,
    });
  }),

  // GET /chat/messages/:id - Get a specific message
  http.get('*/chat/messages/:id', ({ params, request }) => {
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

    const messageId = params.id as string;

    const message = db.chatMessage.findFirst({
      where: {
        id: {
          equals: messageId,
        },
      },
    });

    if (!message) {
      return HttpResponse.json(
        {
          code: 404,
          message: 'Message not found',
          data: null,
        },
        { status: 404 },
      );
    }

    const response: ChatMessage = {
      id: message.id,
      content: message.content,
      userId: message.userId,
      createdAt: message.createdAt,
    };

    return HttpResponse.json({
      code: 200,
      message: 'Success',
      data: response,
    });
  }),

  // DELETE /chat/messages/:id - Delete a message
  http.delete('*/chat/messages/:id', ({ params, request }) => {
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

    const messageId = params.id as string;

    const message = db.chatMessage.findFirst({
      where: {
        id: {
          equals: messageId,
        },
      },
    });

    if (!message) {
      return HttpResponse.json(
        {
          code: 404,
          message: 'Message not found',
          data: null,
        },
        { status: 404 },
      );
    }

    // Only allow users to delete their own messages
    if (message.userId !== userId) {
      return HttpResponse.json(
        {
          code: 403,
          message: 'Forbidden: You can only delete your own messages',
          data: null,
        },
        { status: 403 },
      );
    }

    db.chatMessage.delete({
      where: {
        id: {
          equals: messageId,
        },
      },
    });

    return HttpResponse.json({
      code: 200,
      message: 'Message deleted',
      data: null,
    });
  }),
];
