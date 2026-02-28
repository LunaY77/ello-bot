import * as React from 'react';
import { configureAuth } from 'react-query-auth';
import { Navigate, useLocation } from 'react-router';

import { authConfig } from './auth-config';
import { useCurrentUser } from './auth-hooks';

import { paths } from '@/config/paths';

const { AuthLoader } = configureAuth(authConfig);

export { AuthLoader };

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const user = useCurrentUser();
  const location = useLocation();

  if (!user.data) {
    return (
      <Navigate to={paths.auth.login.getHref(location.pathname)} replace />
    );
  }

  return children;
};
