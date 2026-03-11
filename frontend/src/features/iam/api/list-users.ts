import { queryOptions, useQuery } from '@tanstack/react-query';

import { iamQueryKeys } from './query-keys';

import type { UserAccountResponse } from '@/api/models/resp';
import { api } from '@/lib/api-client';
import type { QueryConfig } from '@/lib/react-query';

export const listUsers = ({
  tenantId,
}: {
  tenantId?: number | null;
} = {}): Promise<UserAccountResponse[]> => {
  return api.get('/iam/users', {
    params: tenantId ? { tenant_id: tenantId } : undefined,
  });
};

export const listUsersQueryOptions = ({
  tenantId,
}: {
  tenantId?: number | null;
} = {}) =>
  queryOptions({
    queryKey: iamQueryKeys.userList(tenantId),
    queryFn: () => listUsers({ tenantId }),
  });

type UseUsersOptions = {
  tenantId?: number | null;
  queryConfig?: QueryConfig<typeof listUsersQueryOptions>;
};

export const useUsers = ({ tenantId, queryConfig }: UseUsersOptions = {}) =>
  useQuery({
    ...listUsersQueryOptions({ tenantId }),
    ...queryConfig,
  });
