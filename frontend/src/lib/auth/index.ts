export {
  authConfig,
  AUTHENTICATED_USER_QUERY_KEY,
  fetchCurrentViewer,
} from './auth-config';

export { useCurrentUser, useLogin, useLogout, useRegister } from './auth-hooks';

export { AuthLoader, ProtectedRoute } from './AuthComponents';
export {
  getViewerAccount,
  getViewerAvatarUrl,
  getViewerDisplayName,
  getViewerHandle,
} from './viewer';
