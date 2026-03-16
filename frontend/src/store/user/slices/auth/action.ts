import { type UserStore } from '../../store';

import type { StoreSetter } from '@/store/types';

/** Setter type matching zustand's internal set signature */
type Setter = StoreSetter<UserStore>;

/**
 * Authentication actions implementation using class-based pattern.
 * Manages auth session tokens via private zustand setter.
 */
export class UserAuthActionImpl {
  readonly #set: Setter;

  constructor(set: Setter, get: () => UserStore, _api?: unknown) {
    void _api;
    void get;
    this.#set = set;
  }

  /** Persist the current auth session after login, registration, or refresh. */
  setSession = ({
    accessToken,
    refreshToken,
  }: {
    accessToken: string;
    refreshToken: string;
  }): void => {
    this.#set({ accessToken, refreshToken });
  };

  /** Clear the current auth session on logout or terminal auth failure. */
  clearSession = (): void => {
    this.#set({ accessToken: null, refreshToken: null });
  };
}

/** Public action type extracted from the implementation class */
export type UserAuthAction = Pick<UserAuthActionImpl, keyof UserAuthActionImpl>;

/** Factory function to create the auth slice with zustand's set function */
export const createAuthSlice = (
  set: Setter,
  get: () => UserStore,
  _api?: unknown,
): UserAuthActionImpl => new UserAuthActionImpl(set, get, _api);
