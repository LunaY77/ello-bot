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

// Route modules expose clientLoader/clientAction; this adapter converts them into router-native keys.
const convert = (queryClient: QueryClient) => (m: RouteModule) => {
  const { clientLoader, clientAction, default: Component, ...rest } = m;
  return {
    ...rest,
    loader: clientLoader?.(queryClient),
    action: clientAction?.(queryClient),
    Component,
  };
};

// Keep the route tree close to the IA: public, auth, then protected app surfaces grouped by folder.
export const createAppRouter = (queryClient: QueryClient) =>
  createBrowserRouter([
    {
      path: paths.home.path,
      lazy: () => import('./routes/public/Landing').then(convert(queryClient)),
    },
    {
      path: paths.auth.register.path,
      lazy: () => import('./routes/auth/Register').then(convert(queryClient)),
    },
    {
      path: paths.auth.login.path,
      lazy: () => import('./routes/auth/Login').then(convert(queryClient)),
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
          path: paths.app.users.path,
          lazy: () =>
            import('./routes/app/admin/Users').then(convert(queryClient)),
        },
        {
          path: paths.app.roles.path,
          lazy: () =>
            import('./routes/app/admin/Roles').then(convert(queryClient)),
        },
        {
          path: paths.app.sessions.path,
          lazy: () =>
            import('./routes/app/admin/Sessions').then(convert(queryClient)),
        },
        {
          path: paths.app.permissions.path,
          lazy: () =>
            import('./routes/app/admin/Permissions').then(convert(queryClient)),
        },
        {
          path: paths.app.agents.path,
          lazy: () =>
            import('./routes/app/admin/Agents').then(convert(queryClient)),
        },
        {
          path: paths.app.profile.path,
          lazy: () =>
            import('./routes/app/settings/Profile').then(convert(queryClient)),
        },
        {
          path: paths.app.workspaces.path,
          lazy: () =>
            import('./routes/app/settings/Workspaces').then(
              convert(queryClient),
            ),
        },
        {
          path: paths.app.dashboard.path,
          lazy: () =>
            import('./routes/app/assistant/Dashboard').then(
              convert(queryClient),
            ),
        },
      ],
    },
    {
      path: '*',
      lazy: () => import('./routes/system/NotFound').then(convert(queryClient)),
    },
  ]);
