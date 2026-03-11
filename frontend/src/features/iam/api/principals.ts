import { queryOptions, useQuery } from '@tanstack/react-query';

import { iamQueryKeys } from './query-keys';

import type {
  MembershipResponse,
  PrincipalPermissionSnapshotResponse,
  RoleResponse,
  TenantSummaryResponse,
} from '@/api/models/resp';
import { api } from '@/lib/api-client';
import type { QueryConfig } from '@/lib/react-query';

export type PrincipalMembershipResponse = {
  membership: MembershipResponse;
  tenant: TenantSummaryResponse;
};

export type PrincipalRoleAssignmentResponse = {
  role: RoleResponse;
};

export const getPrincipalRoles = ({
  principalId,
  tenantId,
}: {
  principalId: number;
  tenantId: number;
}): Promise<PrincipalRoleAssignmentResponse[]> => {
  return api.get(`/iam/principals/${principalId}/roles`, {
    params: { tenant_id: tenantId },
  });
};

export const getPrincipalRolesQueryOptions = ({
  principalId,
  tenantId,
}: {
  principalId: number;
  tenantId: number;
}) =>
  queryOptions({
    queryKey: iamQueryKeys.principalRoles(principalId, tenantId),
    queryFn: () => getPrincipalRoles({ principalId, tenantId }),
    enabled: Boolean(principalId && tenantId),
  });

type UsePrincipalRolesOptions = {
  principalId: number;
  tenantId: number;
  queryConfig?: QueryConfig<typeof getPrincipalRolesQueryOptions>;
};

export const usePrincipalRoles = ({
  principalId,
  tenantId,
  queryConfig,
}: UsePrincipalRolesOptions) =>
  useQuery({
    ...getPrincipalRolesQueryOptions({ principalId, tenantId }),
    ...queryConfig,
  });

export const getPrincipalPermissions = ({
  principalId,
  tenantId,
}: {
  principalId: number;
  tenantId: number;
}): Promise<PrincipalPermissionSnapshotResponse> => {
  return api.get(`/iam/principals/${principalId}/permissions`, {
    params: { tenant_id: tenantId },
  });
};

export const getPrincipalPermissionsQueryOptions = ({
  principalId,
  tenantId,
}: {
  principalId: number;
  tenantId: number;
}) =>
  queryOptions({
    queryKey: iamQueryKeys.principalPermissions(principalId, tenantId),
    queryFn: () => getPrincipalPermissions({ principalId, tenantId }),
    enabled: Boolean(principalId && tenantId),
  });

type UsePrincipalPermissionsOptions = {
  principalId: number;
  tenantId: number;
  queryConfig?: QueryConfig<typeof getPrincipalPermissionsQueryOptions>;
};

export const usePrincipalPermissions = ({
  principalId,
  tenantId,
  queryConfig,
}: UsePrincipalPermissionsOptions) =>
  useQuery({
    ...getPrincipalPermissionsQueryOptions({ principalId, tenantId }),
    ...queryConfig,
  });
