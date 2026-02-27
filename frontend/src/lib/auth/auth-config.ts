import { api } from '../api-client';

import type { LoginRequest, RegisterRequest } from '@/api/models/req';
import type { AuthResponse, UserInfoResponse } from '@/api/models/resp';
import { getUserStoreState } from '@/store/user';

/**
 * Fetches the current user's information from the backend API.
 * Skips the request entirely if no token is present in the store.
 *
 * @returns A promise that resolves to the user info or null if not authenticated.
 */
const getUser = async (): Promise<UserInfoResponse | null> => {
  const { token } = getUserStoreState();
  if (!token) return null;

  return await api.get('/users/me');
};

/**
 * Logs in a user and persists the JWT token to the store.
 *
 * @param data - Login credentials (username and password)
 * @returns The authenticated user's information.
 */
const login = async (data: LoginRequest): Promise<UserInfoResponse> => {
  const response: AuthResponse = await api.post('/auth/login', data);
  getUserStoreState().setToken(response.token);
  return response.user;
};

/**
 * Registers a new user and persists the JWT token to the store.
 *
 * @param data - Registration data (username and password)
 * @returns The newly registered user's information.
 */
const register = async (data: RegisterRequest): Promise<UserInfoResponse> => {
  const response: AuthResponse = await api.post('/auth/register', data);
  getUserStoreState().setToken(response.token);
  return response.user;
};

/**
 * Logs out the current user and clears the JWT token from the store.
 */
const logout = async (): Promise<void> => {
  try {
    await api.post('/auth/logout');
  } finally {
    getUserStoreState().clearToken();
  }
};

export const authConfig = {
  userFn: getUser,
  loginFn: login,
  registerFn: register,
  logoutFn: logout,
};
