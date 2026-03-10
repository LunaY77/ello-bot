import { queryOptions, useQuery } from '@tanstack/react-query';

import { iamQueryKeys } from './query-keys';

import type {
  MembershipResponse,
  PrincipalPermissionSnapshotResponse,
  PrincipalResponse,
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

export const getPrincipal = (
  principalId: number,
): Promise<PrincipalResponse> => {
  return api.get(`/iam/principals/${principalId}`);
};

export const getPrincipalQueryOptions = (principalId: number) =>
  queryOptions({
    queryKey: iamQueryKeys.principal(principalId),
    queryFn: () => getPrincipal(principalId),
    enabled: Boolean(principalId),
  });

type UsePrincipalOptions = {
  principalId: number;
  queryConfig?: QueryConfig<typeof getPrincipalQueryOptions>;
};

export const usePrincipal = ({
  principalId,
  queryConfig,
}: UsePrincipalOptions) =>
  useQuery({
    ...getPrincipalQueryOptions(principalId),
    ...queryConfig,
  });

export const getPrincipalMemberships = (
  principalId: number,
): Promise<PrincipalMembershipResponse[]> => {
  return api.get(`/iam/principals/${principalId}/memberships`);
};

export const getPrincipalMembershipsQueryOptions = (principalId: number) =>
  queryOptions({
    queryKey: iamQueryKeys.principalMemberships(principalId),
    queryFn: () => getPrincipalMemberships(principalId),
    enabled: Boolean(principalId),
  });

type UsePrincipalMembershipsOptions = {
  principalId: number;
  queryConfig?: QueryConfig<typeof getPrincipalMembershipsQueryOptions>;
};

export const usePrincipalMemberships = ({
  principalId,
  queryConfig,
}: UsePrincipalMembershipsOptions) =>
  useQuery({
    ...getPrincipalMembershipsQueryOptions(principalId),
    ...queryConfig,
  });

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
