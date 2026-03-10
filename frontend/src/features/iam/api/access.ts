import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { iamQueryKeys } from './query-keys';

import type {
  CreateAclEntryRequest,
  CreateMembershipRequest,
  CreateRoleRequest,
  ReplaceRolePermissionsRequest,
  UpdateAclEntryRequest,
  UpdateMembershipRequest,
  UpdateRoleRequest,
} from '@/api/models/req';
import type { AclEntryResponse, MembershipResponse, RoleResponse } from '@/api/models/resp';
import { api } from '@/lib/api-client';
import type { MutationConfig, QueryConfig } from '@/lib/react-query';

const invalidatePrincipalScope = async (
  queryClient: ReturnType<typeof useQueryClient>,
  principalId: number,
) => {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: iamQueryKeys.principal(principalId),
    }),
    queryClient.invalidateQueries({
      queryKey: iamQueryKeys.principalMemberships(principalId),
    }),
    queryClient.invalidateQueries({
      queryKey: iamQueryKeys.principalRoleScope(principalId),
    }),
    queryClient.invalidateQueries({
      queryKey: iamQueryKeys.principalPermissionScope(principalId),
    }),
  ]);
};

export const listTenantMemberships = (
  tenantId: number,
): Promise<MembershipResponse[]> => {
  return api.get(`/iam/tenants/${tenantId}/members`);
};

export const listTenantMembershipsQueryOptions = (tenantId: number) =>
  queryOptions({
    queryKey: iamQueryKeys.tenantMemberships(tenantId),
    queryFn: () => listTenantMemberships(tenantId),
    enabled: Boolean(tenantId),
  });

type UseTenantMembershipsOptions = {
  tenantId: number;
  queryConfig?: QueryConfig<typeof listTenantMembershipsQueryOptions>;
};

export const useTenantMemberships = ({
  tenantId,
  queryConfig,
}: UseTenantMembershipsOptions) =>
  useQuery({
    ...listTenantMembershipsQueryOptions(tenantId),
    ...queryConfig,
  });

export const createTenantMembership = ({
  tenantId,
  payload,
}: {
  tenantId: number;
  payload: CreateMembershipRequest;
}): Promise<MembershipResponse> => {
  return api.post(`/iam/tenants/${tenantId}/members`, payload);
};

export const updateTenantMembership = ({
  tenantId,
  principalId,
  payload,
}: {
  tenantId: number;
  principalId: number;
  payload: UpdateMembershipRequest;
}): Promise<MembershipResponse> => {
  return api.patch(`/iam/tenants/${tenantId}/members/${principalId}`, payload);
};

export const deleteTenantMembership = async ({
  tenantId,
  principalId,
}: {
  tenantId: number;
  principalId: number;
}): Promise<void> => {
  await api.delete(`/iam/tenants/${tenantId}/members/${principalId}`);
};

export const grantTenantRole = async ({
  tenantId,
  principalId,
  roleId,
}: {
  tenantId: number;
  principalId: number;
  roleId: number;
}): Promise<void> => {
  await api.post(
    `/iam/tenants/${tenantId}/members/${principalId}/roles/${roleId}`,
  );
};

export const revokeTenantRole = async ({
  tenantId,
  principalId,
  roleId,
}: {
  tenantId: number;
  principalId: number;
  roleId: number;
}): Promise<void> => {
  await api.delete(
    `/iam/tenants/${tenantId}/members/${principalId}/roles/${roleId}`,
  );
};

export const listTenantRoles = (tenantId: number): Promise<RoleResponse[]> => {
  return api.get(`/iam/tenants/${tenantId}/roles`);
};

export const listTenantRolesQueryOptions = (tenantId: number) =>
  queryOptions({
    queryKey: iamQueryKeys.tenantRoles(tenantId),
    queryFn: () => listTenantRoles(tenantId),
    enabled: Boolean(tenantId),
  });

type UseTenantRolesOptions = {
  tenantId: number;
  queryConfig?: QueryConfig<typeof listTenantRolesQueryOptions>;
};

export const useTenantRoles = ({
  tenantId,
  queryConfig,
}: UseTenantRolesOptions) =>
  useQuery({
    ...listTenantRolesQueryOptions(tenantId),
    ...queryConfig,
  });

export const createTenantRole = ({
  tenantId,
  payload,
}: {
  tenantId: number;
  payload: CreateRoleRequest;
}): Promise<RoleResponse> => {
  return api.post(`/iam/tenants/${tenantId}/roles`, payload);
};

export const updateTenantRole = ({
  tenantId,
  roleId,
  payload,
}: {
  tenantId: number;
  roleId: number;
  payload: UpdateRoleRequest;
}): Promise<RoleResponse> => {
  return api.patch(`/iam/tenants/${tenantId}/roles/${roleId}`, payload);
};

export const deleteTenantRole = async ({
  tenantId,
  roleId,
}: {
  tenantId: number;
  roleId: number;
}): Promise<void> => {
  await api.delete(`/iam/tenants/${tenantId}/roles/${roleId}`);
};

export const replaceTenantRolePermissions = ({
  tenantId,
  roleId,
  payload,
}: {
  tenantId: number;
  roleId: number;
  payload: ReplaceRolePermissionsRequest;
}): Promise<RoleResponse> => {
  return api.put(
    `/iam/tenants/${tenantId}/roles/${roleId}/permissions`,
    payload,
  );
};

export const addTenantRolePermission = async ({
  tenantId,
  roleId,
  permissionId,
}: {
  tenantId: number;
  roleId: number;
  permissionId: number;
}): Promise<void> => {
  await api.post(
    `/iam/tenants/${tenantId}/roles/${roleId}/permissions/${permissionId}`,
  );
};

export const removeTenantRolePermission = async ({
  tenantId,
  roleId,
  permissionId,
}: {
  tenantId: number;
  roleId: number;
  permissionId: number;
}): Promise<void> => {
  await api.delete(
    `/iam/tenants/${tenantId}/roles/${roleId}/permissions/${permissionId}`,
  );
};

type TenantAclFilters = {
  resourceType?: string | null;
  resourceId?: number | null;
  permissionId?: number | null;
};

export const listTenantAclEntries = ({
  tenantId,
  filters,
}: {
  tenantId: number;
  filters?: TenantAclFilters;
}): Promise<AclEntryResponse[]> => {
  return api.get(`/iam/tenants/${tenantId}/acl`, {
    params: {
      resource_type: filters?.resourceType ?? undefined,
      resource_id: filters?.resourceId ?? undefined,
      permission_id: filters?.permissionId ?? undefined,
    },
  });
};

export const listTenantAclEntriesQueryOptions = ({
  tenantId,
  filters,
}: {
  tenantId: number;
  filters?: TenantAclFilters;
}) =>
  queryOptions({
    queryKey: iamQueryKeys.tenantAcl(tenantId, filters),
    queryFn: () => listTenantAclEntries({ tenantId, filters }),
    enabled: Boolean(tenantId),
  });

type UseTenantAclEntriesOptions = {
  tenantId: number;
  filters?: TenantAclFilters;
  queryConfig?: QueryConfig<typeof listTenantAclEntriesQueryOptions>;
};

export const useTenantAclEntries = ({
  tenantId,
  filters,
  queryConfig,
}: UseTenantAclEntriesOptions) =>
  useQuery({
    ...listTenantAclEntriesQueryOptions({ tenantId, filters }),
    ...queryConfig,
  });

export const createAclEntry = ({
  tenantId,
  payload,
}: {
  tenantId: number;
  payload: CreateAclEntryRequest;
}): Promise<AclEntryResponse> => {
  return api.post(`/iam/tenants/${tenantId}/acl`, payload);
};

export const updateAclEntry = ({
  tenantId,
  aclId,
  payload,
}: {
  tenantId: number;
  aclId: number;
  payload: UpdateAclEntryRequest;
}): Promise<AclEntryResponse> => {
  return api.patch(`/iam/tenants/${tenantId}/acl/${aclId}`, payload);
};

export const deleteAclEntry = async ({
  tenantId,
  aclId,
}: {
  tenantId: number;
  aclId: number;
}): Promise<void> => {
  await api.delete(`/iam/tenants/${tenantId}/acl/${aclId}`);
};

type UseCreateTenantMembershipOptions = {
  mutationConfig?: MutationConfig<typeof createTenantMembership>;
};

export const useCreateTenantMembership = ({
  mutationConfig,
}: UseCreateTenantMembershipOptions = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    ...restConfig,
    mutationFn: createTenantMembership,
    onSuccess: async (...args) => {
      const [, { tenantId, payload }] = args;
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: iamQueryKeys.tenantMemberships(tenantId),
        }),
        invalidatePrincipalScope(queryClient, payload.principalId),
      ]);
      await onSuccess?.(...args);
    },
  });
};

type UseUpdateTenantMembershipOptions = {
  mutationConfig?: MutationConfig<typeof updateTenantMembership>;
};

export const useUpdateTenantMembership = ({
  mutationConfig,
}: UseUpdateTenantMembershipOptions = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    ...restConfig,
    mutationFn: updateTenantMembership,
    onSuccess: async (...args) => {
      const [, { tenantId, principalId }] = args;
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: iamQueryKeys.tenantMemberships(tenantId),
        }),
        invalidatePrincipalScope(queryClient, principalId),
      ]);
      await onSuccess?.(...args);
    },
  });
};

type UseDeleteTenantMembershipOptions = {
  mutationConfig?: MutationConfig<typeof deleteTenantMembership>;
};

export const useDeleteTenantMembership = ({
  mutationConfig,
}: UseDeleteTenantMembershipOptions = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    ...restConfig,
    mutationFn: deleteTenantMembership,
    onSuccess: async (...args) => {
      const [, { tenantId, principalId }] = args;
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: iamQueryKeys.tenantMemberships(tenantId),
        }),
        invalidatePrincipalScope(queryClient, principalId),
      ]);
      await onSuccess?.(...args);
    },
  });
};

type UseGrantTenantRoleOptions = {
  mutationConfig?: MutationConfig<typeof grantTenantRole>;
};

export const useGrantTenantRole = ({
  mutationConfig,
}: UseGrantTenantRoleOptions = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    ...restConfig,
    mutationFn: grantTenantRole,
    onSuccess: async (...args) => {
      const [, { tenantId, principalId }] = args;
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: iamQueryKeys.tenantMemberships(tenantId),
        }),
        invalidatePrincipalScope(queryClient, principalId),
      ]);
      await onSuccess?.(...args);
    },
  });
};

type UseRevokeTenantRoleOptions = {
  mutationConfig?: MutationConfig<typeof revokeTenantRole>;
};

export const useRevokeTenantRole = ({
  mutationConfig,
}: UseRevokeTenantRoleOptions = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    ...restConfig,
    mutationFn: revokeTenantRole,
    onSuccess: async (...args) => {
      const [, { tenantId, principalId }] = args;
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: iamQueryKeys.tenantMemberships(tenantId),
        }),
        invalidatePrincipalScope(queryClient, principalId),
      ]);
      await onSuccess?.(...args);
    },
  });
};

type UseCreateTenantRoleOptions = {
  mutationConfig?: MutationConfig<typeof createTenantRole>;
};

export const useCreateTenantRole = ({
  mutationConfig,
}: UseCreateTenantRoleOptions = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    ...restConfig,
    mutationFn: createTenantRole,
    onSuccess: async (...args) => {
      const [, { tenantId }] = args;
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: iamQueryKeys.tenantRoles(tenantId),
        }),
        queryClient.invalidateQueries({
          queryKey: iamQueryKeys.principals(),
        }),
      ]);
      await onSuccess?.(...args);
    },
  });
};

type UseUpdateTenantRoleOptions = {
  mutationConfig?: MutationConfig<typeof updateTenantRole>;
};

export const useUpdateTenantRole = ({
  mutationConfig,
}: UseUpdateTenantRoleOptions = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    ...restConfig,
    mutationFn: updateTenantRole,
    onSuccess: async (...args) => {
      const [, { tenantId }] = args;
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: iamQueryKeys.tenantRoles(tenantId),
        }),
        queryClient.invalidateQueries({
          queryKey: iamQueryKeys.principals(),
        }),
      ]);
      await onSuccess?.(...args);
    },
  });
};

type UseDeleteTenantRoleOptions = {
  mutationConfig?: MutationConfig<typeof deleteTenantRole>;
};

export const useDeleteTenantRole = ({
  mutationConfig,
}: UseDeleteTenantRoleOptions = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    ...restConfig,
    mutationFn: deleteTenantRole,
    onSuccess: async (...args) => {
      const [, { tenantId }] = args;
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: iamQueryKeys.tenantRoles(tenantId),
        }),
        queryClient.invalidateQueries({
          queryKey: iamQueryKeys.principals(),
        }),
      ]);
      await onSuccess?.(...args);
    },
  });
};

type UseReplaceTenantRolePermissionsOptions = {
  mutationConfig?: MutationConfig<typeof replaceTenantRolePermissions>;
};

export const useReplaceTenantRolePermissions = ({
  mutationConfig,
}: UseReplaceTenantRolePermissionsOptions = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    ...restConfig,
    mutationFn: replaceTenantRolePermissions,
    onSuccess: async (...args) => {
      const [, { tenantId }] = args;
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: iamQueryKeys.tenantRoles(tenantId),
        }),
        queryClient.invalidateQueries({
          queryKey: iamQueryKeys.principals(),
        }),
      ]);
      await onSuccess?.(...args);
    },
  });
};

type UseAddTenantRolePermissionOptions = {
  mutationConfig?: MutationConfig<typeof addTenantRolePermission>;
};

export const useAddTenantRolePermission = ({
  mutationConfig,
}: UseAddTenantRolePermissionOptions = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    ...restConfig,
    mutationFn: addTenantRolePermission,
    onSuccess: async (...args) => {
      const [, { tenantId }] = args;
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: iamQueryKeys.tenantRoles(tenantId),
        }),
        queryClient.invalidateQueries({
          queryKey: iamQueryKeys.principals(),
        }),
      ]);
      await onSuccess?.(...args);
    },
  });
};

type UseRemoveTenantRolePermissionOptions = {
  mutationConfig?: MutationConfig<typeof removeTenantRolePermission>;
};

export const useRemoveTenantRolePermission = ({
  mutationConfig,
}: UseRemoveTenantRolePermissionOptions = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    ...restConfig,
    mutationFn: removeTenantRolePermission,
    onSuccess: async (...args) => {
      const [, { tenantId }] = args;
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: iamQueryKeys.tenantRoles(tenantId),
        }),
        queryClient.invalidateQueries({
          queryKey: iamQueryKeys.principals(),
        }),
      ]);
      await onSuccess?.(...args);
    },
  });
};

type UseCreateAclEntryOptions = {
  mutationConfig?: MutationConfig<typeof createAclEntry>;
};

export const useCreateAclEntry = ({
  mutationConfig,
}: UseCreateAclEntryOptions = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    ...restConfig,
    mutationFn: createAclEntry,
    onSuccess: async (...args) => {
      const [, { tenantId, payload }] = args;
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: iamQueryKeys.tenantAclScope(tenantId),
        }),
        payload.subjectPrincipalId
          ? invalidatePrincipalScope(queryClient, payload.subjectPrincipalId)
          : Promise.resolve(),
      ]);
      await onSuccess?.(...args);
    },
  });
};

type UseUpdateAclEntryOptions = {
  mutationConfig?: MutationConfig<typeof updateAclEntry>;
};

export const useUpdateAclEntry = ({
  mutationConfig,
}: UseUpdateAclEntryOptions = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    ...restConfig,
    mutationFn: updateAclEntry,
    onSuccess: async (...args) => {
      const [, { tenantId, payload }] = args;
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: iamQueryKeys.tenantAclScope(tenantId),
        }),
        payload.subjectPrincipalId
          ? invalidatePrincipalScope(queryClient, payload.subjectPrincipalId)
          : Promise.resolve(),
      ]);
      await onSuccess?.(...args);
    },
  });
};

type UseDeleteAclEntryOptions = {
  mutationConfig?: MutationConfig<typeof deleteAclEntry>;
};

export const useDeleteAclEntry = ({
  mutationConfig,
}: UseDeleteAclEntryOptions = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    ...restConfig,
    mutationFn: deleteAclEntry,
    onSuccess: async (...args) => {
      const [, { tenantId }] = args;
      await queryClient.invalidateQueries({
        queryKey: iamQueryKeys.tenantAclScope(tenantId),
      });
      await onSuccess?.(...args);
    },
  });
};
