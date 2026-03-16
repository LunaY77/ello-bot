import { type QueryClient } from '@tanstack/react-query';
import type { ComponentType } from 'react';
import { createBrowserRouter } from 'react-router';

import {
  default as AppRoot,
  ErrorBoundary as AppRootErrorBoundary,
} from './routes/app/Root';

import { paths } from '@/config/paths';
import { ProtectedRoute } from '@/lib/auth';

type RouteModule = {
  clientLoader?: (queryClient: QueryClient) => unknown;
  clientAction?: (queryClient: QueryClient) => unknown;
  default: ComponentType;
} & Record<string, unknown>;

// Route modules expose client loaders/actions; this adapter keeps them optional.
const convert = (queryClient: QueryClient) => (module: RouteModule) => {
  const { clientLoader, clientAction, default: Component, ...rest } = module;

  return {
    ...rest,
    loader: clientLoader?.(queryClient),
    action: clientAction?.(queryClient),
    Component,
  };
};

export const createAppRouter = (queryClient: QueryClient) =>
  createBrowserRouter([
    {
      path: paths.home.path,
      lazy: () => import('./routes/public/Landing').then(convert(queryClient)),
    },
    {
      path: paths.auth.login.path,
      lazy: () => import('./routes/auth/Login').then(convert(queryClient)),
    },
    {
      path: paths.auth.register.path,
      lazy: () => import('./routes/auth/Register').then(convert(queryClient)),
    },
    {
      path: paths.app.root.path,
      element: (
        <ProtectedRoute>
          <AppRoot />
        </ProtectedRoute>
      ),
      ErrorBoundary: AppRootErrorBoundary,
      children: [
        {
          path: paths.app.overview.path,
          lazy: () =>
            import('./routes/app/account/Overview').then(convert(queryClient)),
        },
        {
          path: paths.app.profile.path,
          lazy: () =>
            import('./routes/app/account/Profile').then(convert(queryClient)),
        },
        {
          path: paths.app.settings.path,
          lazy: () =>
            import('./routes/app/account/Settings').then(convert(queryClient)),
        },
        {
          path: paths.app.sessions.path,
          lazy: () =>
            import('./routes/app/account/Sessions').then(convert(queryClient)),
        },
      ],
    },
    {
      path: '*',
      lazy: () => import('./routes/system/NotFound').then(convert(queryClient)),
    },
  ]);
