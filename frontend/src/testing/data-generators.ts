import {
  randFullName,
  randNumber,
  randPastDate,
  randText,
  randUuid,
} from '@ngneat/falso';

import type { UserInfoResponse } from '@/api/models/resp';

/**
 * Chat message interface for mock data
 */
export interface ChatMessage {
  id: string;
  content: string;
  userId: number;
  createdAt: string;
}

/**
 * Generate a mock user with realistic fake data
 * @param overrides - Optional partial user data to override defaults
 * @returns A complete UserInfoResponse object
 */
export function createUser(
  overrides?: Partial<UserInfoResponse>,
): UserInfoResponse {
  const id = randNumber({ min: 1, max: 10000 });
  const username = randFullName().replace(/\s+/g, '_').toLowerCase();

  return {
    id,
    username,
    avatar: `https://i.pravatar.cc/150?u=${id}`,
    role: 'user',
    isActive: true,
    ...overrides,
  };
}

/**
 * Generate a mock chat message with realistic fake data
 * @param overrides - Optional partial message data to override defaults
 * @returns A complete ChatMessage object
 */
export function createChatMessage(
  overrides?: Partial<ChatMessage>,
): ChatMessage {
  return {
    id: randUuid(),
    content: randText({ charCount: randNumber({ min: 20, max: 200 }) }),
    userId: randNumber({ min: 1, max: 100 }),
    createdAt: randPastDate({ years: 1 }).toISOString(),
    ...overrides,
  };
}
