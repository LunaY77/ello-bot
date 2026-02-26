import { type UserStore } from '../../store';

import type { StoreSetter } from '@/store/types';

/** Setter type matching zustand's internal set signature */
type Setter = StoreSetter<UserStore>;

/**
 * Authentication actions implementation using class-based pattern.
 * Manages JWT token state via private zustand setter.
 */
export class UserAuthActionImpl {
  readonly #set: Setter;

  constructor(set: Setter, get: () => UserStore, _api?: unknown) {
    void _api;
    void get;
    this.#set = set;
  }

  /** Store JWT token after successful login/register */
  setToken = (token: string): void => {
    this.#set({ token });
  };

  /** Clear JWT token on logout or 401 unauthorized */
  clearToken = (): void => {
    this.#set({ token: null });
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
