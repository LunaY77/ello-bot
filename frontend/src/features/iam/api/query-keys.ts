export const iamQueryKeys = {
  all: () => ['iam'] as const,
  tenants: () => [...iamQueryKeys.all(), 'tenants'] as const,
  visibleTenants: () => [...iamQueryKeys.tenants(), 'visible'] as const,
  tenant: (tenantId: number) =>
    [...iamQueryKeys.tenants(), 'detail', tenantId] as const,
  memberships: () => [...iamQueryKeys.all(), 'memberships'] as const,
  tenantMemberships: (tenantId: number) =>
    [...iamQueryKeys.memberships(), tenantId] as const,
  roles: () => [...iamQueryKeys.all(), 'roles'] as const,
  tenantRoles: (tenantId: number) =>
    [...iamQueryKeys.roles(), tenantId] as const,
  permissions: () => [...iamQueryKeys.all(), 'permissions'] as const,
  permission: (permissionId: number) =>
    [...iamQueryKeys.permissions(), 'detail', permissionId] as const,
  acl: () => [...iamQueryKeys.all(), 'acl'] as const,
  tenantAclScope: (tenantId: number) => [...iamQueryKeys.acl(), tenantId] as const,
  tenantAcl: (
    tenantId: number,
    filters?: {
      resourceType?: string | null;
      resourceId?: number | null;
      permissionId?: number | null;
    },
  ) =>
    [
      ...iamQueryKeys.acl(),
      tenantId,
      filters?.resourceType ?? 'all',
      filters?.resourceId ?? 'all',
      filters?.permissionId ?? 'all',
    ] as const,
  agents: () => [...iamQueryKeys.all(), 'agents'] as const,
  agentList: (tenantId?: number | null) =>
    [...iamQueryKeys.agents(), 'list', tenantId ?? 'current'] as const,
  agent: (principalId: number) =>
    [...iamQueryKeys.agents(), 'detail', principalId] as const,
  principals: () => [...iamQueryKeys.all(), 'principals'] as const,
  principal: (principalId: number) =>
    [...iamQueryKeys.principals(), 'detail', principalId] as const,
  principalMemberships: (principalId: number) =>
    [...iamQueryKeys.principal(principalId), 'memberships'] as const,
  principalRoles: (principalId: number, tenantId: number) =>
    [...iamQueryKeys.principal(principalId), 'roles', tenantId] as const,
  principalRoleScope: (principalId: number) =>
    [...iamQueryKeys.principal(principalId), 'roles'] as const,
  principalPermissions: (principalId: number, tenantId: number) =>
    [...iamQueryKeys.principal(principalId), 'permissions', tenantId] as const,
  principalPermissionScope: (principalId: number) =>
    [...iamQueryKeys.principal(principalId), 'permissions'] as const,
} as const;
