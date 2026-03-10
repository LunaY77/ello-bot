import { api } from '../api-client';

import type { LoginRequest, RegisterRequest } from '@/api/models/req';
import type { AuthMeResponse, AuthTokenResponse } from '@/api/models/resp';
import i18n from '@/lib/i18n';
import { getUserStoreState } from '@/store/user';

export const AUTHENTICATED_USER_QUERY_KEY = ['authenticated-user'] as const;

/**
 * Fetches the current user's information from the backend API.
 * Skips the request entirely if no auth session tokens are present in the store.
 *
 * @returns A promise that resolves to the user info or null if not authenticated.
 */
export const fetchCurrentViewer = async (): Promise<AuthMeResponse | null> => {
  const { accessToken, refreshToken } = getUserStoreState();
  if (!accessToken && !refreshToken) return null;

  return await api.get('/iam/auth/me');
};

/**
 * Store a freshly issued auth session and resolve the current viewer snapshot.
 */
const persistSessionAndGetViewer = async (
  session: AuthTokenResponse,
): Promise<AuthMeResponse> => {
  getUserStoreState().setSession({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  });

  const viewer = await fetchCurrentViewer();
  if (!viewer) {
    throw new Error(i18n.t('restoreFailure', { ns: 'auth' }));
  }

  return viewer;
};

/**
 * Logs in a user and persists the IAM auth session.
 *
 * @param data - Login credentials (username and password)
 * @returns The authenticated viewer snapshot.
 */
const login = async (data: LoginRequest): Promise<AuthMeResponse> => {
  const response: AuthTokenResponse = await api.post('/iam/auth/login', data);
  return await persistSessionAndGetViewer(response);
};

/**
 * Registers a new user and persists the IAM auth session.
 *
 * @param data - Registration data (username and password)
 * @returns The authenticated viewer snapshot.
 */
const register = async (data: RegisterRequest): Promise<AuthMeResponse> => {
  const response: AuthTokenResponse = await api.post('/iam/auth/register', data);
  return await persistSessionAndGetViewer(response);
};

/**
 * Logs out the current user and clears the local auth session.
 */
const logout = async (): Promise<void> => {
  try {
    await api.post('/iam/auth/logout');
  } finally {
    getUserStoreState().clearSession();
  }
};

export const authConfig = {
  userFn: fetchCurrentViewer,
  loginFn: login,
  registerFn: register,
  logoutFn: logout,
};
