import type { StateCreator } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';

import { flattenActions } from '../utils/flatten-actions';

import { type UserState, initialState } from './initial-state';
import { type UserAuthAction, createAuthSlice } from './slices/auth/action';

/** Combined auth-session store type: state + all slice actions */
export type UserStore = UserState & UserAuthAction;

type UserStoreAction = UserAuthAction;

const createStore: StateCreator<UserStore> = (...parameters) => ({
  ...initialState,
  ...flattenActions<UserStoreAction>([createAuthSlice(...parameters)]),
});

/**
 * Persisted auth-session store with shallow equality.
 * Use `useUserStore(selector)` in React components.
 */
export const useUserStore = createWithEqualityFn<UserStore>()(
  subscribeWithSelector(
    persist(createStore, {
      name: 'ELLO_AUTH_SESSION',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }),
  ),
  shallow,
);

/** Get auth-session state outside React components (e.g., in API interceptors). */
export const getUserStoreState = () => useUserStore.getState();
