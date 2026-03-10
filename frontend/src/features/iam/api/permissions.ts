import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { iamQueryKeys } from './query-keys';

import type { CreatePermissionRequest, UpdatePermissionRequest } from '@/api/models/req';
import type { PermissionResponse } from '@/api/models/resp';
import { api } from '@/lib/api-client';
import type { MutationConfig, QueryConfig } from '@/lib/react-query';

export const listPermissions = (): Promise<PermissionResponse[]> => {
  return api.get('/iam/permissions');
};

export const listPermissionsQueryOptions = () =>
  queryOptions({
    queryKey: iamQueryKeys.permissions(),
    queryFn: listPermissions,
  });

export const usePermissions = (
  queryConfig?: QueryConfig<typeof listPermissionsQueryOptions>,
) =>
  useQuery({
    ...listPermissionsQueryOptions(),
    ...queryConfig,
  });

export const getPermission = (
  permissionId: number,
): Promise<PermissionResponse> => {
  return api.get(`/iam/permissions/${permissionId}`);
};

export const getPermissionQueryOptions = (permissionId: number) =>
  queryOptions({
    queryKey: iamQueryKeys.permission(permissionId),
    queryFn: () => getPermission(permissionId),
    enabled: Boolean(permissionId),
  });

type UsePermissionOptions = {
  permissionId: number;
  queryConfig?: QueryConfig<typeof getPermissionQueryOptions>;
};

export const usePermission = ({
  permissionId,
  queryConfig,
}: UsePermissionOptions) =>
  useQuery({
    ...getPermissionQueryOptions(permissionId),
    ...queryConfig,
  });

export const createPermission = (
  payload: CreatePermissionRequest,
): Promise<PermissionResponse> => {
  return api.post('/iam/permissions', payload);
};

export const updatePermission = ({
  permissionId,
  payload,
}: {
  permissionId: number;
  payload: UpdatePermissionRequest;
}): Promise<PermissionResponse> => {
  return api.patch(`/iam/permissions/${permissionId}`, payload);
};

export const deletePermission = async ({
  permissionId,
}: {
  permissionId: number;
}): Promise<void> => {
  await api.delete(`/iam/permissions/${permissionId}`);
};

type UseCreatePermissionOptions = {
  mutationConfig?: MutationConfig<typeof createPermission>;
};

export const useCreatePermission = ({
  mutationConfig,
}: UseCreatePermissionOptions = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    ...restConfig,
    mutationFn: createPermission,
    onSuccess: async (...args) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: iamQueryKeys.permissions(),
        }),
        queryClient.invalidateQueries({
          queryKey: iamQueryKeys.roles(),
        }),
        queryClient.invalidateQueries({
          queryKey: iamQueryKeys.acl(),
        }),
      ]);
      await onSuccess?.(...args);
    },
  });
};

type UseUpdatePermissionOptions = {
  mutationConfig?: MutationConfig<typeof updatePermission>;
};

export const useUpdatePermission = ({
  mutationConfig,
}: UseUpdatePermissionOptions = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    ...restConfig,
    mutationFn: updatePermission,
    onSuccess: async (...args) => {
      const [, { permissionId }] = args;
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: iamQueryKeys.permissions(),
        }),
        queryClient.invalidateQueries({
          queryKey: iamQueryKeys.permission(permissionId),
        }),
        queryClient.invalidateQueries({
          queryKey: iamQueryKeys.roles(),
        }),
        queryClient.invalidateQueries({
          queryKey: iamQueryKeys.acl(),
        }),
      ]);
      await onSuccess?.(...args);
    },
  });
};

type UseDeletePermissionOptions = {
  mutationConfig?: MutationConfig<typeof deletePermission>;
};

export const useDeletePermission = ({
  mutationConfig,
}: UseDeletePermissionOptions = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    ...restConfig,
    mutationFn: deletePermission,
    onSuccess: async (...args) => {
      const [, { permissionId }] = args;
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: iamQueryKeys.permissions(),
        }),
        queryClient.removeQueries({
          queryKey: iamQueryKeys.permission(permissionId),
        }),
        queryClient.invalidateQueries({
          queryKey: iamQueryKeys.roles(),
        }),
        queryClient.invalidateQueries({
          queryKey: iamQueryKeys.acl(),
        }),
      ]);
      await onSuccess?.(...args);
    },
  });
};
