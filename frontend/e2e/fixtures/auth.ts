import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const AUTH_STORAGE_KEY = 'ELLO_AUTH_SESSION';

const DEFAULT_API_URL = 'http://localhost:8001/api';

type Credentials = {
  username: string;
  password: string;
  displayName: string;
};

type AuthSession = {
  accessToken: string;
  refreshToken: string;
};

type AuthTokenPayload = AuthSession & {
  user?: {
    username: string;
  } | null;
};

type ResultPayload<T> = {
  code: string | number;
  message: string;
  data: T;
};

export const getApiBaseUrl = () =>
  process.env.PLAYWRIGHT_API_URL ?? DEFAULT_API_URL;

export const createCredentials = (prefix = 'e2e'): Credentials => {
  const suffix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

  return {
    username: `${prefix}${suffix}`.slice(0, 20),
    password: `Secret_${suffix}`,
    displayName: `E2E ${suffix}`,
  };
};

export const registerUser = async (
  request: APIRequestContext,
  credentials: Credentials,
): Promise<AuthTokenPayload> => {
  const response = await request.post(`${getApiBaseUrl()}/iam/auth/register`, {
    data: credentials,
  });

  expect(response.ok()).toBeTruthy();

  const payload = (await response.json()) as ResultPayload<AuthTokenPayload>;
  return payload.data;
};

export const loginUser = async (
  request: APIRequestContext,
  credentials: Pick<Credentials, 'username' | 'password'>,
): Promise<AuthTokenPayload> => {
  const response = await request.post(`${getApiBaseUrl()}/iam/auth/login`, {
    data: credentials,
  });

  expect(response.ok()).toBeTruthy();

  const payload = (await response.json()) as ResultPayload<AuthTokenPayload>;
  return payload.data;
};

export const persistAuthSession = async (
  page: Page,
  session: AuthSession,
): Promise<void> => {
  await page.goto('/');
  await page.evaluate(
    ({ storageKey, persistedValue }) => {
      localStorage.setItem(storageKey, JSON.stringify(persistedValue));
    },
    {
      storageKey: AUTH_STORAGE_KEY,
      persistedValue: {
        state: {
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
        },
        version: 0,
      },
    },
  );
};
