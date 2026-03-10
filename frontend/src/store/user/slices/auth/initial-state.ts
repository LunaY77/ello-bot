/**
 * Authentication slice state definition.
 */
export interface UserAuthState {
  /** Opaque access token, null when not authenticated */
  accessToken: string | null;
  /** Opaque refresh token, null when not authenticated */
  refreshToken: string | null;
}

export const initialAuthState: UserAuthState = {
  accessToken: null,
  refreshToken: null,
};
