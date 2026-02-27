import { queryOptions, useQuery } from '@tanstack/react-query';

import type { UserInfoResponse } from '@/api/models/resp';
import { api } from '@/lib/api-client';
import type { QueryConfig } from '@/lib/react-query';

/**
 * Fetch a user's profile. API: GET /users/{userId}
 */
export const getUser = ({
  userId,
}: {
  userId: string;
}): Promise<UserInfoResponse> => {
  return api.get(`/users/${userId}`);
};

/**
 * queryOptions factory for fetching a user's profile. Can be used in any React Query hook (useQuery, useInfiniteQuery, etc.)
 */
export const getUserQueryOptions = (userId: string) => {
  return queryOptions({
    queryKey: ['user', userId],
    queryFn: () => getUser({ userId }),
  });
};

/**
 * config for useUserProfile hook
 */
type UseUserProfileOptions = {
  userId: string;
  queryConfig?: QueryConfig<typeof getUserQueryOptions>;
};

/**
 * Hook to fetch a user's profile using React Query. Automatically handles caching, loading states, and errors.
 */
export const useUserProfile = ({
  userId,
  queryConfig,
}: UseUserProfileOptions) => {
  return useQuery({
    ...getUserQueryOptions(userId),
    ...queryConfig,
  });
};
