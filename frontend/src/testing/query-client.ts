import { QueryClient } from '@tanstack/react-query';

import { queryConfig } from '@/lib/react-query';

/**
 * Create a QueryClient tuned for deterministic component tests.
 */
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      ...queryConfig,
      queries: {
        ...queryConfig.queries,
        gcTime: 0,
      },
    },
  });
