import { type UserStore } from '../../store';

export const authSelectors = {
  /** Check if user is authenticated (has any persisted auth session token). */
  isAuthenticated: (s: UserStore): boolean =>
    s.accessToken !== null || s.refreshToken !== null,
  /** Get the current opaque access token. */
  accessToken: (s: UserStore): string | null => s.accessToken,
  /** Get the current opaque refresh token. */
  refreshToken: (s: UserStore): string | null => s.refreshToken,
};
