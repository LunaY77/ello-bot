import { type UserStore } from '../../store';

export const authSelectors = {
  /** Check if user is authenticated (has a valid token) */
  isAuthenticated: (s: UserStore): boolean => s.token !== null,
  /** Get the current JWT token */
  token: (s: UserStore): string | null => s.token,
};
