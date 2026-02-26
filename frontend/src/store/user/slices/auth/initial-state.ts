/**
 * Authentication slice state definition.
 */
export interface UserAuthState {
  /** JWT access token, null when not authenticated */
  token: string | null;
}

export const initialAuthState: UserAuthState = {
  token: null,
};
