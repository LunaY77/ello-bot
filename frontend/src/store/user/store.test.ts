import { beforeEach, describe, expect, it } from 'vitest';

import { getUserStoreState, useUserStore } from './store';

const STORAGE_KEY = 'ELLO_AUTH_SESSION';

describe('user auth store', () => {
  beforeEach(() => {
    localStorage.clear();
    getUserStoreState().clearSession();
  });

  it('persists a full auth session', () => {
    getUserStoreState().setSession({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    expect(useUserStore.getState().accessToken).toBe('access-token');
    expect(useUserStore.getState().refreshToken).toBe('refresh-token');

    const persistedValue = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? '{}',
    );
    expect(persistedValue.state).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
  });

  it('clears both the in-memory and persisted session', () => {
    getUserStoreState().setSession({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    getUserStoreState().clearSession();

    expect(useUserStore.getState().accessToken).toBeNull();
    expect(useUserStore.getState().refreshToken).toBeNull();

    const persistedValue = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? '{}',
    );
    expect(persistedValue.state).toEqual({
      accessToken: null,
      refreshToken: null,
    });
  });
});
