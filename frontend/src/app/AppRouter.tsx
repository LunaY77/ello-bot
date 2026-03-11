import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { RouterProvider } from 'react-router/dom';

import { createAppRouter } from './CreateAppRouter';

export const AppRouter = () => {
  const queryClient = useQueryClient();
  const router = useMemo(() => createAppRouter(queryClient), [queryClient]);
  return <RouterProvider router={router} />;
};
