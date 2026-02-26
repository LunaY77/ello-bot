import type { StateCreator } from 'zustand';
import { persist, subscribeWithSelector } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';
import { createWithEqualityFn } from 'zustand/traditional';

import { flattenActions } from '../utils/flatten-actions';

import { type UserState, initialState } from './initial-state';
import { type UserAuthAction, createAuthSlice } from './slices/auth/action';

/** Combined user store type: state + all slice actions */
export type UserStore = UserState & UserAuthAction;

type UserStoreAction = UserAuthAction;

const createStore: StateCreator<UserStore> = (...parameters) => ({
  ...initialState,
  ...flattenActions<UserStoreAction>([createAuthSlice(...parameters)]),
});

/**
 * User store hook with persist (token → localStorage) and shallow equality.
 * Use `useUserStore(selector)` in React components.
 */
export const useUserStore = createWithEqualityFn<UserStore>()(
  subscribeWithSelector(
    persist(createStore, {
      name: 'ELLO_AUTH_TOKEN',
      partialize: (state) => ({ token: state.token }),
    }),
  ),
  shallow,
);

/** Get user store state outside React components (e.g., in axios interceptors) */
export const getUserStoreState = () => useUserStore.getState();
