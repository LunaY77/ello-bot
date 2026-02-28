import { authHandlers } from './handlers/auth';
import { chatHandlers } from './handlers/chat';
import { usersHandlers } from './handlers/users';

/**
 * Combined MSW handlers for all API endpoints
 */
export const handlers = [...authHandlers, ...usersHandlers, ...chatHandlers];
