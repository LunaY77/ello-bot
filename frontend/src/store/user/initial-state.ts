import {
  type UserAuthState,
  initialAuthState,
} from './slices/auth/initial-state';

/** Aggregated user store state type (all slices combined) */
export type UserState = UserAuthState;

/** Aggregated initial state for the user store */
export const initialState: UserState = {
  ...initialAuthState,
};
