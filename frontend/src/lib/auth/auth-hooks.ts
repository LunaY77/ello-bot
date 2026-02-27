import { configureAuth } from 'react-query-auth';

import { authConfig } from './auth-config';

// Configure once, export only hooks (no components) -> Fast Refresh friendly
const { useUser, useLogin, useRegister, useLogout } = configureAuth(authConfig);

export const useCurrentUser = useUser;
export { useLogin, useLogout, useRegister };
