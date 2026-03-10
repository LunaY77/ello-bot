import * as React from 'react';
import { configureAuth } from 'react-query-auth';
import { Navigate, useLocation } from 'react-router';

import { authConfig } from './auth-config';
import { useCurrentUser } from './auth-hooks';

import { Spinner } from '@/components/ui/spinner';
import { paths } from '@/config/paths';

const { AuthLoader } = configureAuth(authConfig);

export { AuthLoader };

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const user = useCurrentUser();
  const location = useLocation();

  if (user.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="xl" />
      </div>
    );
  }

  if (!user.data) {
    return (
      <Navigate to={paths.auth.login.getHref(location.pathname)} replace />
    );
  }

  return children;
};
