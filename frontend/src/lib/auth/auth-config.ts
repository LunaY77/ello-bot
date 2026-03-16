import type { LoginRequest, RegisterRequest } from '@/api/models/req';
import type { AuthTokenResponse, CurrentUserResponse } from '@/api/models/resp';
import { sessionsOperations, userOperations } from '@/api/operations';
import { requestApiOperation } from '@/lib/api-client';
import i18n from '@/lib/i18n';
import { getUserStoreState } from '@/store/user';

export const AUTHENTICATED_USER_QUERY_KEY = ['authenticated-user'] as const;

const toCurrentUser = ({
  user,
  settings,
}: AuthTokenResponse): CurrentUserResponse => ({
  user,
  settings,
});

/**
 * Fetches the current user's information from the backend API.
 * Skips the request entirely if no auth session tokens are present in the store.
 *
 * @returns A promise that resolves to the user info or null if not authenticated.
 */
export const fetchCurrentViewer =
  async (): Promise<CurrentUserResponse | null> => {
    const { accessToken, refreshToken } = getUserStoreState();
    if (!accessToken && !refreshToken) return null;

    return await requestApiOperation(userOperations.getCurrentUser);
  };

/**
 * Store a freshly issued auth session and return the normalized current-user snapshot.
 */
const persistSession = (session: AuthTokenResponse): CurrentUserResponse => {
  getUserStoreState().setSession({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  });

  const viewer = toCurrentUser(session);
  if (!viewer.user) {
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
const login = async (data: LoginRequest): Promise<CurrentUserResponse> => {
  const response = await requestApiOperation(sessionsOperations.login, {
    data,
  });
  return persistSession(response);
};

/**
 * Registers a new user and persists the IAM auth session.
 *
 * @param data - Registration data (username and password)
 * @returns The authenticated viewer snapshot.
 */
const register = async (
  data: RegisterRequest,
): Promise<CurrentUserResponse> => {
  const response = await requestApiOperation(sessionsOperations.register, {
    data,
  });
  return persistSession(response);
};

/**
 * Logs out the current user and clears the local auth session.
 */
const logout = async (): Promise<void> => {
  try {
    await requestApiOperation(sessionsOperations.logout);
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
