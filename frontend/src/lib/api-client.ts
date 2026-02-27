import Axios, { type InternalAxiosRequestConfig } from 'axios';

import type { Result } from '@/api/models/resp/result';
import { useNotifications } from '@/components/ui/notifications';
import { env } from '@/config/env';
import { paths } from '@/config/paths';
import { getUserStoreState } from '@/store/user';

/**
 * Request interceptor that attaches JWT Bearer token and sets default headers.
 * Reads the token from the user store on every request.
 */
function authRequestInterceptor(config: InternalAxiosRequestConfig) {
  if (config.headers) {
    config.headers.Accept = 'application/json';
  }

  const { token } = getUserStoreState();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
}

/** Global axios instance with baseURL from environment config */
export const api = Axios.create({
  baseURL: env.API_URL,
});

api.interceptors.request.use(authRequestInterceptor);

api.interceptors.response.use(
  (response) => {
    const payload = response.data;
    return isResult(payload) ? payload.data : payload;
  },
  (error) => {
    const message = error.response?.data?.message || error.message;

    useNotifications.getState().addNotification({
      type: 'error',
      title: 'Error',
      message,
    });

    // 401 Unauthorized: clear token and redirect to login page
    if (error.response?.status === 401) {
      const { clearToken } = getUserStoreState();
      clearToken();

      const redirectTo = globalThis.location.pathname;
      globalThis.location.href = paths.auth.login.getHref(redirectTo);
    }

    return Promise.reject(error);
  },
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isResult<T = unknown>(x: any): x is Result<T> {
  return (
    x && typeof x === 'object' && 'code' in x && 'message' in x && 'data' in x
  );
}
