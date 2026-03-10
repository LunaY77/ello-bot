import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { iamQueryKeys } from './query-keys';

import type { CreateTenantRequest, UpdateTenantRequest } from '@/api/models/req';
import type { TenantSummaryResponse } from '@/api/models/resp';
import { api } from '@/lib/api-client';
import type { MutationConfig, QueryConfig } from '@/lib/react-query';

export const listVisibleTenants = (): Promise<TenantSummaryResponse[]> => {
  return api.get('/iam/tenants');
};

export const listVisibleTenantsQueryOptions = () =>
  queryOptions({
    queryKey: iamQueryKeys.visibleTenants(),
    queryFn: listVisibleTenants,
  });

export const useVisibleTenants = (
  queryConfig?: QueryConfig<typeof listVisibleTenantsQueryOptions>,
) =>
  useQuery({
    ...listVisibleTenantsQueryOptions(),
    ...queryConfig,
  });

export const getTenant = (tenantId: number): Promise<TenantSummaryResponse> => {
  return api.get(`/iam/tenants/${tenantId}`);
};

export const getTenantQueryOptions = (tenantId: number) =>
  queryOptions({
    queryKey: iamQueryKeys.tenant(tenantId),
    queryFn: () => getTenant(tenantId),
    enabled: Boolean(tenantId),
  });

type UseTenantOptions = {
  tenantId: number;
  queryConfig?: QueryConfig<typeof getTenantQueryOptions>;
};

export const useTenant = ({ tenantId, queryConfig }: UseTenantOptions) =>
  useQuery({
    ...getTenantQueryOptions(tenantId),
    ...queryConfig,
  });

export const createTenant = (
  payload: CreateTenantRequest,
): Promise<TenantSummaryResponse> => {
  return api.post('/iam/tenants', payload);
};

export const updateTenant = ({
  tenantId,
  payload,
}: {
  tenantId: number;
  payload: UpdateTenantRequest;
}): Promise<TenantSummaryResponse> => {
  return api.patch(`/iam/tenants/${tenantId}`, payload);
};

export const deleteTenant = async ({
  tenantId,
}: {
  tenantId: number;
}): Promise<void> => {
  await api.delete(`/iam/tenants/${tenantId}`);
};

type UseCreateTenantOptions = {
  mutationConfig?: MutationConfig<typeof createTenant>;
};

export const useCreateTenant = ({
  mutationConfig,
}: UseCreateTenantOptions = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    ...restConfig,
    mutationFn: createTenant,
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({
        queryKey: iamQueryKeys.visibleTenants(),
      });
      await onSuccess?.(...args);
    },
  });
};

type UseUpdateTenantOptions = {
  mutationConfig?: MutationConfig<typeof updateTenant>;
};

export const useUpdateTenant = ({
  mutationConfig,
}: UseUpdateTenantOptions = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    ...restConfig,
    mutationFn: updateTenant,
    onSuccess: async (...args) => {
      const [, { tenantId }] = args;
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: iamQueryKeys.visibleTenants(),
        }),
        queryClient.invalidateQueries({
          queryKey: iamQueryKeys.tenant(tenantId),
        }),
      ]);
      await onSuccess?.(...args);
    },
  });
};

type UseDeleteTenantOptions = {
  mutationConfig?: MutationConfig<typeof deleteTenant>;
};

export const useDeleteTenant = ({
  mutationConfig,
}: UseDeleteTenantOptions = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    ...restConfig,
    mutationFn: deleteTenant,
    onSuccess: async (...args) => {
      const [, { tenantId }] = args;
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: iamQueryKeys.visibleTenants(),
        }),
        queryClient.removeQueries({
          queryKey: iamQueryKeys.tenant(tenantId),
        }),
        queryClient.invalidateQueries({
          queryKey: iamQueryKeys.tenantMemberships(tenantId),
        }),
        queryClient.invalidateQueries({
          queryKey: iamQueryKeys.tenantRoles(tenantId),
        }),
        queryClient.invalidateQueries({
          queryKey: iamQueryKeys.tenantAclScope(tenantId),
        }),
      ]);
      await onSuccess?.(...args);
    },
  });
};
