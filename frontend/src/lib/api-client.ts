import Axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';

import type { AuthTokenResponse } from '@/api/models/resp';
import type { Result } from '@/api/models/resp/result';
import { useNotifications } from '@/components/ui/notifications';
import { env } from '@/config/env';
import { paths } from '@/config/paths';
import i18n from '@/lib/i18n';
import { getUserStoreState } from '@/store/user';

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  _skipAuthRefresh?: boolean;
};

/**
 * Request interceptor that attaches the opaque Bearer access token.
 */
function authRequestInterceptor(config: InternalAxiosRequestConfig) {
  if (config.headers) {
    config.headers.Accept = 'application/json';
  }

  const { accessToken } = getUserStoreState();
  if (accessToken && config.headers && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
}

/** Global axios instance with baseURL from environment config */
export const api = Axios.create({
  baseURL: env.API_URL,
});

const rawApi = Axios.create({
  baseURL: env.API_URL,
});

api.interceptors.request.use(authRequestInterceptor);

let refreshPromise: Promise<AuthTokenResponse | null> | null = null;

function isResult<T = unknown>(x: unknown): x is Result<T> {
  return (
    Boolean(x) &&
    typeof x === 'object' &&
    'code' in (x as Result<T>) &&
    'message' in (x as Result<T>) &&
    'data' in (x as Result<T>)
  );
}

function unwrapResult<T>(payload: unknown): T | null {
  return isResult<T>(payload) ? payload.data : (payload as T);
}

function redirectToLogin() {
  const { pathname, search } = globalThis.location;
  if (pathname.startsWith('/auth/')) return;

  const redirectTo = `${pathname}${search}`;
  globalThis.location.href = paths.auth.login.getHref(redirectTo);
}

async function refreshAuthSession(): Promise<AuthTokenResponse | null> {
  const { refreshToken, setSession, clearSession } = getUserStoreState();
  if (!refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = rawApi
      .post<Result<AuthTokenResponse>>(
        '/iam/auth/refresh',
        { refreshToken },
        { headers: { Accept: 'application/json' } },
      )
      .then((response) => {
        const payload = unwrapResult<AuthTokenResponse>(response.data);
        if (!payload) {
          throw new Error('Refresh token response is empty.');
        }

        setSession({
          accessToken: payload.accessToken,
          refreshToken: payload.refreshToken,
        });
        return payload;
      })
      .catch((error) => {
        clearSession();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return await refreshPromise;
}

function shouldAttemptRefresh(
  config?: RetriableRequestConfig,
  status?: number,
): boolean {
  if (!config || status !== 401 || config._retry || config._skipAuthRefresh) {
    return false;
  }

  const url = config.url ?? '';
  if (
    url.includes('/iam/auth/login') ||
    url.includes('/iam/auth/register') ||
    url.includes('/iam/auth/refresh')
  ) {
    return false;
  }

  return Boolean(getUserStoreState().refreshToken);
}

api.interceptors.response.use(
  (response) => {
    return unwrapResult(response.data);
  },
  async (error: AxiosError<Result<unknown>>) => {
    const config = error.config as RetriableRequestConfig | undefined;

    if (shouldAttemptRefresh(config, error.response?.status)) {
      try {
        const refreshed = await refreshAuthSession();
        if (refreshed && config) {
          config._retry = true;
          config.headers = config.headers ?? {};
          config.headers.Authorization = `Bearer ${refreshed.accessToken}`;
          return await api(config);
        }
      } catch {
        redirectToLogin();
        return Promise.reject(error);
      }
    }

    if (error.response?.status === 401) {
      getUserStoreState().clearSession();
      redirectToLogin();
      return Promise.reject(error);
    }

    const message = error.response?.data?.message || error.message;

    useNotifications.getState().addNotification({
      type: 'error',
      title: i18n.t('error', { ns: 'common' }),
      message,
    });

    return Promise.reject(error);
  },
);
