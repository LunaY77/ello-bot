import { useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  AlertTriangle,
  Bot,
  Building2,
  KeyRound,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import type { AgentAccountResponse, UserAccountResponse } from '@/api/models/resp';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { paths } from '@/config/paths';
import { useSwitchTenant } from '@/features/auth';
import {
  useCreateAclEntry,
  useCreateAgent,
  useCreatePermission,
  useCreateTenant,
  useCreateTenantMembership,
  useCreateTenantRole,
  useDeleteAclEntry,
  useDeleteAgent,
  useDeletePermission,
  useDeleteTenant,
  useDeleteTenantMembership,
  useDeleteTenantRole,
  usePermissions,
  usePrincipal,
  usePrincipalMemberships,
  usePrincipalPermissions,
  usePrincipalRoles,
  useSetAgentActive,
  useTenant,
  useTenantAclEntries,
  useTenantMemberships,
  useTenantRoles,
  useUpdateAclEntry,
  useUpdateAgent,
  useUpdatePermission,
  useUpdateTenant,
  useUpdateTenantMembership,
  useUpdateTenantRole,
  useVisibleTenants,
  useAgents,
  useChangeAgentOwner,
  useReplaceTenantRolePermissions,
  useGrantTenantRole,
  useRevokeTenantRole,
} from '@/features/iam';
import { useUsers } from '@/features/users';
import {
  AUTHENTICATED_USER_QUERY_KEY,
  getViewerDisplayName,
  getViewerHandle,
  useCurrentUser,
  useLogout,
} from '@/lib/auth';
import { cn } from '@/utils/cn';

type PrincipalDirectoryEntry = {
  principalId: number;
  label: string;
  handle: string;
  kind: 'human' | 'agent';
  avatarUrl?: string;
};

const FIELD_CLASS_NAME =
  'h-11 w-full rounded-2xl border border-stone-300 bg-white px-4 text-sm text-stone-900 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-stone-400 focus:ring-2 focus:ring-stone-200';

const TEXTAREA_CLASS_NAME =
  'min-h-28 w-full rounded-[1.4rem] border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 shadow-sm outline-none transition placeholder:text-stone-400 focus:border-stone-400 focus:ring-2 focus:ring-stone-200';

const parseRequiredNumber = (value: FormDataEntryValue | null): number | null => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const parseOptionalNumber = (value: FormDataEntryValue | null): number | null => {
  const stringValue = String(value ?? '').trim();
  if (!stringValue) return null;
  const parsed = Number(stringValue);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const parseRequiredString = (value: FormDataEntryValue | null): string => {
  return String(value ?? '').trim();
};

const parseOptionalString = (
  value: FormDataEntryValue | null,
): string | null => {
  const parsed = String(value ?? '').trim();
  return parsed ? parsed : null;
};

const statusLabel = (t: (key: string) => string, status?: string | null) => {
  if (!status) return t('shared.unknown');

  const normalized = status.toLowerCase();
  if (
    normalized === 'active' ||
    normalized === 'invited' ||
    normalized === 'suspended' ||
    normalized === 'inactive'
  ) {
    return t(`members.status.${normalized}`);
  }

  return status;
};

const buildPrincipalDirectory = ({
  users,
  agents,
}: {
  users: UserAccountResponse[];
  agents: AgentAccountResponse[];
}): PrincipalDirectoryEntry[] => {
  return [
    ...users.map((user) => ({
      principalId: user.principalId,
      label: user.displayName,
      handle: `@${user.username}`,
      kind: 'human' as const,
      avatarUrl: user.avatarUrl,
    })),
    ...agents.map((agent) => ({
      principalId: agent.principalId,
      label: agent.displayName,
      handle: agent.code,
      kind: 'agent' as const,
      avatarUrl: agent.avatarUrl,
    })),
  ].sort((left, right) => left.label.localeCompare(right.label));
};

const resolvePrincipal = (
  principalDirectory: PrincipalDirectoryEntry[],
  principalId: number,
) => {
  return principalDirectory.find((entry) => entry.principalId === principalId);
};

const SECTION_IDS = {
  workspace: 'iam-workspace',
  people: 'iam-people',
  agents: 'iam-agents',
  lookup: 'iam-lookup',
  roles: 'iam-roles',
  capabilities: 'iam-capabilities',
  overrides: 'iam-overrides',
} as const;

const resolvePrincipalKind = (
  principalType?: string | null,
): PrincipalDirectoryEntry['kind'] | null => {
  const normalized = principalType?.toLowerCase();
  if (!normalized) return null;
  if (normalized === 'agent') return 'agent';
  if (normalized === 'user' || normalized === 'human') return 'human';
  return null;
};

export const IamConsole = () => {
  const { t } = useTranslation('iam');
  const { t: commonT } = useTranslation('common');
  const queryClient = useQueryClient();
  const viewerQuery = useCurrentUser();
  const viewer = viewerQuery.data;
  const logout = useLogout();
  const switchTenant = useSwitchTenant();

  const tenantId = viewer?.tenant.id ?? 0;
  const tenantQuery = useTenant({
    tenantId,
    queryConfig: {
      enabled: Boolean(tenantId),
    },
  });
  const visibleTenants = useVisibleTenants({
    enabled: Boolean(viewer),
  });
  const users = useUsers({
    tenantId,
    queryConfig: {
      enabled: Boolean(tenantId),
    },
  });
  const agents = useAgents({
    tenantId,
    queryConfig: {
      enabled: Boolean(tenantId),
    },
  });
  const memberships = useTenantMemberships({
    tenantId,
    queryConfig: {
      enabled: Boolean(tenantId),
    },
  });
  const roles = useTenantRoles({
    tenantId,
    queryConfig: {
      enabled: Boolean(tenantId),
    },
  });
  const permissions = usePermissions({
    enabled: Boolean(viewer),
  });
  const aclEntries = useTenantAclEntries({
    tenantId,
    queryConfig: {
      enabled: Boolean(tenantId),
    },
  });

  const createTenant = useCreateTenant({
    mutationConfig: {
      onSuccess: async (tenant) => {
        await switchTenant.mutateAsync({ tenantId: tenant.id });
      },
    },
  });
  const updateTenant = useUpdateTenant({
    mutationConfig: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: AUTHENTICATED_USER_QUERY_KEY,
        });
      },
    },
  });
  const deleteTenant = useDeleteTenant();
  const createMembership = useCreateTenantMembership();
  const updateMembership = useUpdateTenantMembership();
  const deleteMembership = useDeleteTenantMembership();
  const grantRole = useGrantTenantRole();
  const revokeRole = useRevokeTenantRole();
  const createRole = useCreateTenantRole();
  const updateRole = useUpdateTenantRole();
  const deleteRole = useDeleteTenantRole();
  const replaceRolePermissions = useReplaceTenantRolePermissions();
  const createPermission = useCreatePermission();
  const updatePermission = useUpdatePermission();
  const deletePermission = useDeletePermission();
  const createAclEntry = useCreateAclEntry();
  const updateAclEntry = useUpdateAclEntry();
  const deleteAclEntry = useDeleteAclEntry();
  const createAgent = useCreateAgent();
  const updateAgent = useUpdateAgent();
  const changeAgentOwner = useChangeAgentOwner();
  const setAgentActive = useSetAgentActive();
  const deleteAgent = useDeleteAgent();

  const [selectedMemberPrincipalId, setSelectedMemberPrincipalId] = useState<
    number | null
  >(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedPermissionId, setSelectedPermissionId] = useState<number | null>(
    null,
  );
  const [selectedAgentPrincipalId, setSelectedAgentPrincipalId] = useState<
    number | null
  >(null);
  const [selectedAclId, setSelectedAclId] = useState<number | null>(null);
  const [inspectFormPrincipalId, setInspectFormPrincipalId] = useState('');
  const [inspection, setInspection] = useState<{
    principalId: number | null;
    tenantId: number;
  }>({
    principalId: null,
    tenantId: 0,
  });

  useEffect(() => {
    if (!tenantId) return;
    setInspection((current) => ({
      principalId: current.principalId,
      tenantId: current.tenantId || tenantId,
    }));
  }, [tenantId]);

  useEffect(() => {
    const items = memberships.data ?? [];
    if (!items.length) {
      setSelectedMemberPrincipalId(null);
      return;
    }

    if (!items.some((item) => item.principalId === selectedMemberPrincipalId)) {
      setSelectedMemberPrincipalId(items[0].principalId);
    }
  }, [memberships.data, selectedMemberPrincipalId]);

  useEffect(() => {
    const items = roles.data ?? [];
    if (!items.length) {
      setSelectedRoleId(null);
      return;
    }

    if (!items.some((item) => item.id === selectedRoleId)) {
      setSelectedRoleId(items[0].id);
    }
  }, [roles.data, selectedRoleId]);

  useEffect(() => {
    const items = permissions.data ?? [];
    if (!items.length) {
      setSelectedPermissionId(null);
      return;
    }

    if (!items.some((item) => item.id === selectedPermissionId)) {
      setSelectedPermissionId(items[0].id);
    }
  }, [permissions.data, selectedPermissionId]);

  useEffect(() => {
    const items = agents.data ?? [];
    if (!items.length) {
      setSelectedAgentPrincipalId(null);
      return;
    }

    if (!items.some((item) => item.principalId === selectedAgentPrincipalId)) {
      setSelectedAgentPrincipalId(items[0].principalId);
    }
  }, [agents.data, selectedAgentPrincipalId]);

  useEffect(() => {
    const items = aclEntries.data ?? [];
    if (!items.length) {
      setSelectedAclId(null);
      return;
    }

    if (!items.some((item) => item.id === selectedAclId)) {
      setSelectedAclId(items[0].id);
    }
  }, [aclEntries.data, selectedAclId]);

  const selectedMemberRoles = usePrincipalRoles({
    principalId: selectedMemberPrincipalId ?? 0,
    tenantId,
    queryConfig: {
      enabled: Boolean(selectedMemberPrincipalId && tenantId),
    },
  });

  const inspectedPrincipal = usePrincipal({
    principalId: inspection.principalId ?? 0,
    queryConfig: {
      enabled: Boolean(inspection.principalId),
    },
  });
  const inspectedMemberships = usePrincipalMemberships({
    principalId: inspection.principalId ?? 0,
    queryConfig: {
      enabled: Boolean(inspection.principalId),
    },
  });
  const inspectedRoles = usePrincipalRoles({
    principalId: inspection.principalId ?? 0,
    tenantId: inspection.tenantId,
    queryConfig: {
      enabled: Boolean(inspection.principalId && inspection.tenantId),
    },
  });
  const inspectedPermissions = usePrincipalPermissions({
    principalId: inspection.principalId ?? 0,
    tenantId: inspection.tenantId,
    queryConfig: {
      enabled: Boolean(inspection.principalId && inspection.tenantId),
    },
  });

  const tenant = tenantQuery.data ?? viewer?.tenant ?? null;
  const currentTenant = tenant ?? viewer?.tenant ?? null;
  const principalDirectory = buildPrincipalDirectory({
    users: users.data ?? [],
    agents: agents.data ?? [],
  });
  const selectedRole =
    roles.data?.find((item) => item.id === selectedRoleId) ?? null;
  const selectedPermission =
    permissions.data?.find((item) => item.id === selectedPermissionId) ?? null;
  const selectedAgent =
    agents.data?.find((item) => item.principalId === selectedAgentPrincipalId) ??
    null;
  const selectedAcl =
    aclEntries.data?.find((item) => item.id === selectedAclId) ?? null;
  const selectedMember =
    memberships.data?.find(
      (item) => item.principalId === selectedMemberPrincipalId,
    ) ?? null;
  const selectedMemberRoleList =
    selectedMemberRoles.data?.map((entry) => entry.role) ?? [];
  const selectedMemberProfile = selectedMember
    ? resolvePrincipal(principalDirectory, selectedMember.principalId)
    : null;
  const selectedAgentOwner = selectedAgent?.ownerPrincipalId
    ? resolvePrincipal(principalDirectory, selectedAgent.ownerPrincipalId)
    : null;
  const inspectedDirectoryEntry = inspection.principalId
    ? resolvePrincipal(principalDirectory, inspection.principalId)
    : null;
  const inspectedKind =
    inspectedDirectoryEntry?.kind ??
    resolvePrincipalKind(inspectedPrincipal.data?.principalType) ??
    'human';
  const inspectionTenant =
    visibleTenants.data?.find((item) => item.id === inspection.tenantId) ??
    null;
  const sectionLinks = [
    {
      id: SECTION_IDS.workspace,
      label: t('jump.workspace'),
      icon: Building2,
    },
    {
      id: SECTION_IDS.people,
      label: t('jump.people'),
      icon: Users,
    },
    {
      id: SECTION_IDS.agents,
      label: t('jump.agents'),
      icon: Bot,
    },
    {
      id: SECTION_IDS.lookup,
      label: t('jump.lookup'),
      icon: Search,
    },
    {
      id: SECTION_IDS.roles,
      label: t('jump.roles'),
      icon: ShieldCheck,
    },
    {
      id: SECTION_IDS.capabilities,
      label: t('jump.capabilities'),
      icon: KeyRound,
    },
    {
      id: SECTION_IDS.overrides,
      label: t('jump.overrides'),
      icon: Sparkles,
    },
  ] satisfies Array<{
    id: string;
    label: string;
    icon: LucideIcon;
  }>;

  if ((viewerQuery.isLoading || tenantQuery.isLoading) && !currentTenant) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <Spinner size="xl" />
      </div>
    );
  }

  if (!viewer || !currentTenant) {
    return null;
  }

  const handleDeleteCurrentTenant = async () => {
    const fallbackTenant =
      visibleTenants.data?.find((item) => item.id !== currentTenant.id) ?? null;

    await deleteTenant.mutateAsync({ tenantId: currentTenant.id });
    await queryClient.invalidateQueries({
      queryKey: AUTHENTICATED_USER_QUERY_KEY,
    });

    if (fallbackTenant) {
      try {
        await switchTenant.mutateAsync({ tenantId: fallbackTenant.id });
        return;
      } catch {
        // fall through to logout
      }
    }

    await logout.mutateAsync(undefined);
    globalThis.location.href = paths.home.getHref();
  };

  const handleWorkspaceCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await createTenant.mutateAsync({
      name: parseRequiredString(form.get('workspaceName')),
      slug: parseRequiredString(form.get('workspaceSlug')),
    });
    event.currentTarget.reset();
  };

  const handleWorkspaceUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await updateTenant.mutateAsync({
      tenantId: currentTenant.id,
      payload: {
        name: parseRequiredString(form.get('name')),
        slug: parseRequiredString(form.get('slug')),
        isActive: form.get('isActive') === 'on',
      },
    });
  };

  const handleMembershipCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const principalId = parseRequiredNumber(form.get('principalId'));
    if (!principalId) return;

    await createMembership.mutateAsync({
      tenantId: currentTenant.id,
      payload: {
        principalId,
        status: parseRequiredString(form.get('status')) || 'active',
      },
    });
    event.currentTarget.reset();
    setSelectedMemberPrincipalId(principalId);
  };

  const handleMembershipUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedMember) return;

    const form = new FormData(event.currentTarget);
    await updateMembership.mutateAsync({
      tenantId: currentTenant.id,
      principalId: selectedMember.principalId,
      payload: {
        status: parseRequiredString(form.get('status')),
      },
    });
  };

  const handleRoleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const created = await createRole.mutateAsync({
      tenantId: currentTenant.id,
      payload: {
        code: parseRequiredString(form.get('code')),
        name: parseRequiredString(form.get('name')),
        description: parseOptionalString(form.get('description')) ?? undefined,
      },
    });
    setSelectedRoleId(created.id);
    event.currentTarget.reset();
  };

  const handleRoleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedRole) return;
    const form = new FormData(event.currentTarget);

    await updateRole.mutateAsync({
      tenantId: currentTenant.id,
      roleId: selectedRole.id,
      payload: {
        code: parseRequiredString(form.get('code')),
        name: parseRequiredString(form.get('name')),
        description: parseOptionalString(form.get('description')),
      },
    });
  };

  const handleRolePermissionsReplace = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (!selectedRole) return;
    const form = new FormData(event.currentTarget);
    const permissionIds = form
      .getAll('permissionIds')
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item));

    await replaceRolePermissions.mutateAsync({
      tenantId: currentTenant.id,
      roleId: selectedRole.id,
      payload: {
        permissionIds,
      },
    });
  };

  const handlePermissionCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const created = await createPermission.mutateAsync({
      code: parseRequiredString(form.get('code')),
      resourceType: parseRequiredString(form.get('resourceType')),
      action: parseRequiredString(form.get('action')),
      description: parseOptionalString(form.get('description')) ?? undefined,
    });
    setSelectedPermissionId(created.id);
    event.currentTarget.reset();
  };

  const handlePermissionUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedPermission) return;
    const form = new FormData(event.currentTarget);

    await updatePermission.mutateAsync({
      permissionId: selectedPermission.id,
      payload: {
        code: parseRequiredString(form.get('code')),
        resourceType: parseRequiredString(form.get('resourceType')),
        action: parseRequiredString(form.get('action')),
        description: parseOptionalString(form.get('description')),
      },
    });
  };

  const handleAclCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const resourceId = parseRequiredNumber(form.get('resourceId'));
    const permissionId = parseRequiredNumber(form.get('permissionId'));
    if (!resourceId || !permissionId) return;

    const created = await createAclEntry.mutateAsync({
      tenantId: currentTenant.id,
      payload: {
        resourceType: parseRequiredString(form.get('resourceType')),
        resourceId,
        permissionId,
        subjectPrincipalId: parseOptionalNumber(form.get('subjectPrincipalId')),
        subjectRoleId: parseOptionalNumber(form.get('subjectRoleId')),
        effect: parseRequiredString(form.get('effect')),
      },
    });

    setSelectedAclId(created.id);
    event.currentTarget.reset();
  };

  const handleAclUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedAcl) return;
    const form = new FormData(event.currentTarget);
    const permissionId = parseRequiredNumber(form.get('permissionId'));
    if (!permissionId) return;

    await updateAclEntry.mutateAsync({
      tenantId: currentTenant.id,
      aclId: selectedAcl.id,
      payload: {
        permissionId,
        subjectPrincipalId: parseOptionalNumber(form.get('subjectPrincipalId')),
        subjectRoleId: parseOptionalNumber(form.get('subjectRoleId')),
        effect: parseRequiredString(form.get('effect')),
      },
    });
  };

  const handleAgentCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const created = await createAgent.mutateAsync({
      code: parseRequiredString(form.get('code')),
      displayName: parseRequiredString(form.get('displayName')),
      description: parseOptionalString(form.get('description')) ?? undefined,
      avatarUrl: parseOptionalString(form.get('avatarUrl')),
      ownerPrincipalId: parseOptionalNumber(form.get('ownerPrincipalId')),
    });

    setSelectedAgentPrincipalId(created.principalId);
    event.currentTarget.reset();
  };

  const handleAgentUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedAgent) return;

    const form = new FormData(event.currentTarget);
    const nextAvatarUrl = parseOptionalString(form.get('avatarUrl'));

    await Promise.all([
      updateAgent.mutateAsync({
        principalId: selectedAgent.principalId,
        payload: {
          displayName: parseRequiredString(form.get('displayName')),
          description: parseOptionalString(form.get('description')),
          avatarUrl: nextAvatarUrl ?? undefined,
        },
      }),
      changeAgentOwner.mutateAsync({
        principalId: selectedAgent.principalId,
        payload: {
          ownerPrincipalId: parseOptionalNumber(form.get('ownerPrincipalId')),
        },
      }),
      setAgentActive.mutateAsync({
        principalId: selectedAgent.principalId,
        payload: {
          isActive: form.get('isActive') === 'on',
        },
      }),
    ]);
  };

  const handleInspectPrincipal = (principalId: number, scopedTenantId?: number) => {
    if (!principalId) return;
    setInspectFormPrincipalId(String(principalId));
    setInspection({
      principalId,
      tenantId: scopedTenantId ?? currentTenant.id,
    });
  };

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2.4rem] border border-stone-200 bg-white/90 shadow-[0_50px_120px_-80px_rgba(50,31,16,0.5)]">
        <div className="bg-[radial-gradient(circle_at_top_left,rgba(191,160,109,0.28),transparent_36%),linear-gradient(135deg,#ffffff_0%,#f5efe6_70%,#eee1d0_100%)] px-6 py-6 sm:px-8">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(20rem,0.9fr)] xl:items-start">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-stone-500">
                {t('hero.eyebrow')}
              </p>
              <h2 className="mt-3 text-[2rem] font-semibold tracking-tight text-stone-950">
                {t('hero.title')}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
                {t('hero.description')}
              </p>
              <nav
                aria-label={t('page.title')}
                className="mt-5 flex flex-wrap gap-2"
              >
                {sectionLinks.map(({ id, label, icon }) => (
                  <SectionJumpLink
                    key={id}
                    href={`#${id}`}
                    label={label}
                    icon={icon}
                  />
                ))}
              </nav>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <SummaryPanel
                label={commonT('dashboard.identity')}
                title={getViewerDisplayName(viewer)}
                subtitle={getViewerHandle(viewer)}
                avatarUrl={viewer.user?.avatarUrl ?? undefined}
                kind={resolvePrincipalKind(viewer.principal.principalType) ?? 'human'}
                badge={
                  <KindBadge
                    kind={resolvePrincipalKind(viewer.principal.principalType) ?? 'human'}
                    humanLabel={t('shared.human')}
                    agentLabel={t('shared.agent')}
                  />
                }
              />
              <SummaryPanel
                label={t('workspace.current')}
                title={currentTenant.name}
                subtitle={currentTenant.slug}
                icon={Building2}
                badge={
                  <StateBadge
                    active={currentTenant.isActive}
                    activeLabel={commonT('dashboard.active')}
                    inactiveLabel={commonT('dashboard.inactive')}
                  />
                }
              />
            </div>
          </div>
        </div>
        <div className="grid gap-px bg-stone-200 md:grid-cols-3 xl:grid-cols-6">
          <StatCard
            icon={Building2}
            label={t('stats.tenants')}
            value={String(visibleTenants.data?.length ?? 0)}
          />
          <StatCard
            icon={Users}
            label={t('stats.memberships')}
            value={String(memberships.data?.length ?? 0)}
          />
          <StatCard
            icon={ShieldCheck}
            label={t('stats.roles')}
            value={String(roles.data?.length ?? 0)}
          />
          <StatCard
            icon={KeyRound}
            label={t('stats.permissions')}
            value={String(permissions.data?.length ?? 0)}
          />
          <StatCard
            icon={Bot}
            label={t('stats.agents')}
            value={String(agents.data?.length ?? 0)}
          />
          <StatCard
            icon={Sparkles}
            label={t('stats.acl')}
            value={String(aclEntries.data?.length ?? 0)}
          />
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <SectionCard
            id={SECTION_IDS.workspace}
            title={t('workspace.title')}
            description={t('workspace.description')}
          >
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4">
                <div>
                  <SectionEyebrow>{t('workspace.current')}</SectionEyebrow>
                  <div className="mt-3 rounded-[1.6rem] border border-stone-200 bg-stone-50/90 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-stone-950">
                          {currentTenant.name}
                        </p>
                        <p className="mt-1 text-sm text-stone-600">
                          {currentTenant.slug}
                        </p>
                      </div>
                      <StateBadge
                        active={currentTenant.isActive}
                        activeLabel={commonT('dashboard.active')}
                        inactiveLabel={commonT('dashboard.inactive')}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <SectionEyebrow>{t('workspace.switch')}</SectionEyebrow>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {visibleTenants.data?.map((item) => {
                      const isCurrent = item.id === currentTenant.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={cn(
                            'rounded-[1.5rem] border px-4 py-4 text-left transition',
                            isCurrent
                              ? 'border-stone-900 bg-stone-900 text-white'
                              : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50',
                          )}
                          disabled={switchTenant.isPending}
                          onClick={() => {
                            if (!isCurrent) {
                              switchTenant.mutate({ tenantId: item.id });
                            }
                          }}
                        >
                          <p className="text-base font-semibold">{item.name}</p>
                          <p
                            className={cn(
                              'mt-1 text-xs uppercase tracking-[0.24em]',
                              isCurrent ? 'text-stone-300' : 'text-stone-500',
                            )}
                          >
                            {item.slug}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <form
                  key={`workspace-${currentTenant.id}`}
                  className="space-y-4 rounded-[1.6rem] border border-stone-200 bg-white p-4"
                  onSubmit={handleWorkspaceUpdate}
                >
                  <SectionEyebrow>{t('workspace.update')}</SectionEyebrow>
                  <Field label={t('workspace.name')}>
                    <input
                      name="name"
                      defaultValue={currentTenant.name}
                      className={FIELD_CLASS_NAME}
                      required
                    />
                  </Field>
                  <Field label={t('workspace.slug')}>
                    <input
                      name="slug"
                      defaultValue={currentTenant.slug}
                      className={FIELD_CLASS_NAME}
                      required
                    />
                  </Field>
                  <label className="flex items-start gap-3 rounded-[1.2rem] border border-stone-200 bg-stone-50 px-4 py-3">
                    <input
                      type="checkbox"
                      name="isActive"
                      defaultChecked={currentTenant.isActive}
                      className="mt-1 size-4 rounded border-stone-300 text-primary focus:ring-primary"
                    />
                    <span>
                      <span className="block text-sm font-medium text-stone-900">
                        {t('workspace.active')}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-stone-500">
                        {t('workspace.activeHint')}
                      </span>
                    </span>
                  </label>
                  <Button
                    type="submit"
                    className="h-11 w-full rounded-2xl"
                    isLoading={updateTenant.isPending}
                  >
                    {t('workspace.update')}
                  </Button>
                </form>

                <form
                  className="space-y-4 rounded-[1.6rem] border border-dashed border-stone-300 bg-stone-50/70 p-4"
                  onSubmit={handleWorkspaceCreate}
                >
                  <SectionEyebrow>{commonT('dashboard.createWorkspace')}</SectionEyebrow>
                  <Field label={t('workspace.name')}>
                    <input
                      name="workspaceName"
                      className={FIELD_CLASS_NAME}
                      placeholder={commonT('dashboard.workspaceNamePlaceholder')}
                      required
                    />
                  </Field>
                  <Field label={t('workspace.slug')}>
                    <input
                      name="workspaceSlug"
                      className={FIELD_CLASS_NAME}
                      placeholder={commonT('dashboard.workspaceSlugPlaceholder')}
                      required
                    />
                  </Field>
                  <Button
                    type="submit"
                    variant="outline"
                    className="h-11 w-full rounded-2xl border-stone-300 bg-white"
                    isLoading={createTenant.isPending || switchTenant.isPending}
                  >
                    {commonT('dashboard.createWorkspace')}
                  </Button>
                </form>

                <div className="rounded-[1.6rem] border border-red-200 bg-red-50/70 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 size-4 text-red-600" />
                    <div>
                      <p className="text-sm font-semibold text-red-800">
                        {t('workspace.delete')}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-red-700/90">
                        {t('workspace.deleteHint')}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    className="mt-4 h-11 w-full rounded-2xl"
                    isLoading={deleteTenant.isPending || logout.isPending}
                    onClick={() => {
                      void handleDeleteCurrentTenant();
                    }}
                  >
                    {t('workspace.delete')}
                  </Button>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            id={SECTION_IDS.people}
            title={t('members.title')}
            description={t('members.description')}
          >
            <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
              <div className="space-y-4">
                <form
                  className="space-y-3 rounded-[1.6rem] border border-stone-200 bg-stone-50/90 p-4"
                  onSubmit={handleMembershipCreate}
                >
                  <SectionEyebrow>{t('members.add')}</SectionEyebrow>
                  <Field label={t('members.principal')}>
                    <input
                      name="principalId"
                      list="iam-principal-directory"
                      className={FIELD_CLASS_NAME}
                      placeholder="1001"
                      required
                    />
                  </Field>
                  <Field label={t('members.status')}>
                    <select name="status" className={FIELD_CLASS_NAME} defaultValue="active">
                      <option value="active">{t('members.status.active')}</option>
                      <option value="invited">{t('members.status.invited')}</option>
                      <option value="suspended">{t('members.status.suspended')}</option>
                      <option value="inactive">{t('members.status.inactive')}</option>
                    </select>
                  </Field>
                  <Button
                    type="submit"
                    className="h-11 w-full rounded-2xl"
                    isLoading={createMembership.isPending}
                  >
                    {t('members.add')}
                  </Button>
                  <datalist id="iam-principal-directory">
                    {principalDirectory.map((entry) => (
                      <option key={entry.principalId} value={entry.principalId}>
                        {entry.label} ({entry.handle})
                      </option>
                    ))}
                  </datalist>
                </form>

                <div className="space-y-3">
                  {memberships.isLoading ? (
                    <LoadingBlock />
                  ) : memberships.data && memberships.data.length > 0 ? (
                    memberships.data.map((membership) => {
                      const principal = resolvePrincipal(
                        principalDirectory,
                        membership.principalId,
                      );
                      const principalKind = principal?.kind ?? 'human';
                      const isSelected =
                        membership.principalId === selectedMemberPrincipalId;

                      return (
                        <button
                          key={membership.id}
                          type="button"
                          className={cn(
                            'w-full rounded-[1.5rem] border px-4 py-4 text-left transition',
                            isSelected
                              ? 'border-stone-900 bg-stone-900 text-white'
                              : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50',
                          )}
                          aria-pressed={isSelected}
                          onClick={() => setSelectedMemberPrincipalId(membership.principalId)}
                        >
                          <div className="flex items-start gap-3">
                            <IdentityAvatar
                              label={principal?.label ?? `Principal #${membership.principalId}`}
                              avatarUrl={principal?.avatarUrl}
                              kind={principalKind}
                            />
                            <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-base font-semibold">
                                  {principal?.label ?? `Principal #${membership.principalId}`}
                                </p>
                                <p
                                  className={cn(
                                    'mt-1 truncate text-xs uppercase tracking-[0.22em]',
                                    isSelected ? 'text-stone-300' : 'text-stone-500',
                                  )}
                                >
                                  {principal?.handle ?? `#${membership.principalId}`}
                                </p>
                                <div className="mt-3">
                                  <KindBadge
                                    kind={principalKind}
                                    humanLabel={t('shared.human')}
                                    agentLabel={t('shared.agent')}
                                    inverted={isSelected}
                                  />
                                </div>
                              </div>
                              <span
                                className={cn(
                                  'rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]',
                                  isSelected
                                    ? 'bg-white/15 text-white'
                                    : 'bg-stone-100 text-stone-600',
                                )}
                              >
                                {statusLabel(t, membership.status)}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <EmptyState>{t('members.empty')}</EmptyState>
                  )}
                </div>
              </div>

              <div className="rounded-[1.6rem] border border-stone-200 bg-white p-4">
                <SectionEyebrow>{t('members.manage')}</SectionEyebrow>
                {selectedMember ? (
                  <>
                    <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-4">
                        <IdentityAvatar
                          label={
                            selectedMemberProfile?.label ??
                            `Principal #${selectedMember.principalId}`
                          }
                          avatarUrl={selectedMemberProfile?.avatarUrl}
                          kind={selectedMemberProfile?.kind ?? 'human'}
                          className="size-14 rounded-[1.25rem]"
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-xl font-semibold text-stone-950">
                              {selectedMemberProfile?.label ??
                                `Principal #${selectedMember.principalId}`}
                            </p>
                            <KindBadge
                              kind={selectedMemberProfile?.kind ?? 'human'}
                              humanLabel={t('shared.human')}
                              agentLabel={t('shared.agent')}
                            />
                          </div>
                          <p className="mt-1 truncate text-sm text-stone-600">
                            {selectedMemberProfile?.handle ??
                              `#${selectedMember.principalId}`}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-2xl border-stone-300 bg-white"
                        onClick={() =>
                          handleInspectPrincipal(selectedMember.principalId)
                        }
                      >
                        {t('members.inspect')}
                      </Button>
                    </div>

                    <form
                      key={`membership-${selectedMember.id}`}
                      className="mt-5 space-y-4"
                      onSubmit={handleMembershipUpdate}
                    >
                      <Field label={t('members.status')}>
                        <select
                          name="status"
                          defaultValue={selectedMember.status}
                          className={FIELD_CLASS_NAME}
                        >
                          <option value="active">{t('members.status.active')}</option>
                          <option value="invited">{t('members.status.invited')}</option>
                          <option value="suspended">
                            {t('members.status.suspended')}
                          </option>
                          <option value="inactive">
                            {t('members.status.inactive')}
                          </option>
                        </select>
                      </Field>
                      <div className="grid gap-3 text-xs uppercase tracking-[0.22em] text-stone-500 sm:grid-cols-2">
                        <MetaBlock
                          label={t('members.createdAt')}
                          value={dayjs(selectedMember.createdAt).format(
                            'YYYY-MM-DD HH:mm',
                          )}
                        />
                        <MetaBlock
                          label={t('members.updatedAt')}
                          value={dayjs(selectedMember.updatedAt).format(
                            'YYYY-MM-DD HH:mm',
                          )}
                        />
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Button
                          type="submit"
                          className="h-11 rounded-2xl"
                          isLoading={updateMembership.isPending}
                        >
                          {t('members.save')}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11 rounded-2xl border-red-300 bg-white text-red-700 hover:bg-red-50"
                          isLoading={deleteMembership.isPending}
                          onClick={() => {
                            void deleteMembership.mutateAsync({
                              tenantId: currentTenant.id,
                              principalId: selectedMember.principalId,
                            });
                          }}
                        >
                          {t('members.remove')}
                        </Button>
                      </div>
                    </form>

                    <div className="mt-6 border-t border-stone-200 pt-6">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-stone-900">
                          {t('members.assignedRoles')}
                        </p>
                        {selectedMemberRoles.isLoading ? <Spinner size="sm" /> : null}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedMemberRoleList.length > 0 ? (
                          selectedMemberRoleList.map((role) => (
                            <button
                              key={role.id}
                              type="button"
                              aria-label={`${t('members.remove')} ${role.name}`}
                              className="inline-flex items-center rounded-full border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-stone-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                              onClick={() => {
                                void revokeRole.mutateAsync({
                                  tenantId: currentTenant.id,
                                  principalId: selectedMember.principalId,
                                  roleId: role.id,
                                });
                              }}
                            >
                              {role.name}
                            </button>
                          ))
                        ) : (
                          <EmptyInline>{t('members.noRoles')}</EmptyInline>
                        )}
                      </div>

                      <form
                        className="mt-4 flex flex-col gap-3 sm:flex-row"
                        onSubmit={(event) => {
                          event.preventDefault();
                          const form = new FormData(event.currentTarget);
                          const roleId = parseRequiredNumber(form.get('roleId'));
                          if (!roleId) return;
                          void grantRole.mutateAsync({
                            tenantId: currentTenant.id,
                            principalId: selectedMember.principalId,
                            roleId,
                          });
                          event.currentTarget.reset();
                        }}
                      >
                        <select
                          name="roleId"
                          className={FIELD_CLASS_NAME}
                          defaultValue=""
                        >
                          <option value="">{t('shared.select')}</option>
                          {roles.data?.map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                        <Button
                          type="submit"
                          className="h-11 rounded-2xl"
                          isLoading={grantRole.isPending || revokeRole.isPending}
                        >
                          {t('members.assignRole')}
                        </Button>
                      </form>
                    </div>
                  </>
                ) : (
                  <EmptyState className="mt-4">{t('members.selectHint')}</EmptyState>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            id={SECTION_IDS.agents}
            title={t('agents.title')}
            description={t('agents.description')}
          >
            <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-4">
                <form
                  className="space-y-3 rounded-[1.6rem] border border-stone-200 bg-stone-50/90 p-4"
                  onSubmit={handleAgentCreate}
                >
                  <SectionEyebrow>{t('agents.create')}</SectionEyebrow>
                  <Field label={t('agents.code')}>
                    <input name="code" className={FIELD_CLASS_NAME} required />
                  </Field>
                  <Field label={t('agents.displayName')}>
                    <input
                      name="displayName"
                      className={FIELD_CLASS_NAME}
                      required
                    />
                  </Field>
                  <Field label={t('agents.descriptionField')}>
                    <textarea name="description" className={TEXTAREA_CLASS_NAME} />
                  </Field>
                  <Field label={t('agents.avatarUrl')}>
                    <input
                      name="avatarUrl"
                      type="url"
                      className={FIELD_CLASS_NAME}
                      placeholder="https://example.com/agent.png"
                    />
                  </Field>
                  <Field label={t('agents.owner')}>
                    <select name="ownerPrincipalId" className={FIELD_CLASS_NAME} defaultValue="">
                      <option value="">{t('agents.unowned')}</option>
                      {(users.data ?? []).map((user) => (
                        <option key={user.principalId} value={user.principalId}>
                          {user.displayName}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Button
                    type="submit"
                    className="h-11 w-full rounded-2xl"
                    isLoading={createAgent.isPending}
                  >
                    {t('agents.create')}
                  </Button>
                </form>

                <div className="space-y-3">
                  {agents.isLoading ? (
                    <LoadingBlock />
                  ) : agents.data && agents.data.length > 0 ? (
                    agents.data.map((agent) => {
                      const owner = agent.ownerPrincipalId
                        ? resolvePrincipal(principalDirectory, agent.ownerPrincipalId)
                        : null;
                      const isSelected =
                        agent.principalId === selectedAgentPrincipalId;

                      return (
                        <button
                          key={agent.principalId}
                          type="button"
                          className={cn(
                            'w-full rounded-[1.5rem] border px-4 py-4 text-left transition',
                            isSelected
                              ? 'border-stone-900 bg-stone-900 text-white'
                              : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50',
                          )}
                          aria-pressed={isSelected}
                          onClick={() => setSelectedAgentPrincipalId(agent.principalId)}
                        >
                          <div className="flex items-start gap-3">
                            <IdentityAvatar
                              label={agent.displayName}
                              avatarUrl={agent.avatarUrl ?? undefined}
                              kind="agent"
                            />
                            <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-base font-semibold">
                                  {agent.displayName}
                                </p>
                                <p
                                  className={cn(
                                    'mt-1 truncate text-xs uppercase tracking-[0.22em]',
                                    isSelected ? 'text-stone-300' : 'text-stone-500',
                                  )}
                                >
                                  {agent.code}
                                </p>
                                <p
                                  className={cn(
                                    'mt-2 truncate text-xs',
                                    isSelected ? 'text-stone-300' : 'text-stone-500',
                                  )}
                                >
                                  {owner?.label ?? t('agents.unowned')}
                                </p>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <StateBadge
                                  active={agent.isActive}
                                  activeLabel={commonT('dashboard.active')}
                                  inactiveLabel={commonT('dashboard.inactive')}
                                  inverted={isSelected}
                                />
                                <KindBadge
                                  kind="agent"
                                  humanLabel={t('shared.human')}
                                  agentLabel={t('shared.agent')}
                                  inverted={isSelected}
                                />
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <EmptyState>{t('agents.empty')}</EmptyState>
                  )}
                </div>
              </div>

              <div className="rounded-[1.6rem] border border-stone-200 bg-white p-4">
                <SectionEyebrow>{t('agents.update')}</SectionEyebrow>
                {selectedAgent ? (
                  <form
                    key={`agent-${selectedAgent.principalId}`}
                    className="mt-4 space-y-4"
                    onSubmit={handleAgentUpdate}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-4">
                        <IdentityAvatar
                          label={selectedAgent.displayName}
                          avatarUrl={selectedAgent.avatarUrl ?? undefined}
                          kind="agent"
                          className="size-14 rounded-[1.25rem]"
                        />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-xl font-semibold text-stone-950">
                              {selectedAgent.displayName}
                            </p>
                            <KindBadge
                              kind="agent"
                              humanLabel={t('shared.human')}
                              agentLabel={t('shared.agent')}
                            />
                            <StateBadge
                              active={selectedAgent.isActive}
                              activeLabel={commonT('dashboard.active')}
                              inactiveLabel={commonT('dashboard.inactive')}
                            />
                          </div>
                          <p className="mt-1 truncate text-sm text-stone-600">
                            {selectedAgent.code}
                          </p>
                          <p className="mt-2 truncate text-xs text-stone-500">
                            {selectedAgentOwner?.label ?? t('agents.unowned')}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-2xl border-stone-300 bg-white"
                        onClick={() =>
                          handleInspectPrincipal(selectedAgent.principalId)
                        }
                      >
                        {t('members.inspect')}
                      </Button>
                    </div>

                    <Field label={t('agents.displayName')}>
                      <input
                        name="displayName"
                        defaultValue={selectedAgent.displayName}
                        className={FIELD_CLASS_NAME}
                        required
                      />
                    </Field>
                    <Field label={t('agents.descriptionField')}>
                      <textarea
                        name="description"
                        defaultValue={selectedAgent.description ?? ''}
                        className={TEXTAREA_CLASS_NAME}
                      />
                    </Field>
                    <Field label={t('agents.avatarUrl')}>
                      <input
                        name="avatarUrl"
                        type="url"
                        defaultValue={selectedAgent.avatarUrl ?? ''}
                        className={FIELD_CLASS_NAME}
                      />
                    </Field>
                    <Field label={t('agents.owner')}>
                      <select
                        name="ownerPrincipalId"
                        defaultValue={selectedAgent.ownerPrincipalId ?? ''}
                        className={FIELD_CLASS_NAME}
                      >
                        <option value="">{t('agents.unowned')}</option>
                        {(users.data ?? []).map((user) => (
                          <option key={user.principalId} value={user.principalId}>
                            {user.displayName}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <label className="flex items-start gap-3 rounded-[1.2rem] border border-stone-200 bg-stone-50 px-4 py-3">
                      <input
                        type="checkbox"
                        name="isActive"
                        defaultChecked={selectedAgent.isActive}
                        className="mt-1 size-4 rounded border-stone-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm font-medium text-stone-900">
                        {t('agents.active')}
                      </span>
                    </label>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        type="submit"
                        className="h-11 rounded-2xl"
                        isLoading={
                          updateAgent.isPending ||
                          changeAgentOwner.isPending ||
                          setAgentActive.isPending
                        }
                      >
                        {t('agents.update')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 rounded-2xl border-red-300 bg-white text-red-700 hover:bg-red-50"
                        isLoading={deleteAgent.isPending}
                        onClick={() => {
                          void deleteAgent.mutateAsync({
                            principalId: selectedAgent.principalId,
                          });
                        }}
                      >
                        {t('agents.delete')}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <EmptyState className="mt-4">{t('agents.selectHint')}</EmptyState>
                )}
              </div>
            </div>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard
            id={SECTION_IDS.lookup}
            title={t('inspector.title')}
            description={t('inspector.description')}
          >
            <form
              className="grid gap-3 rounded-[1.6rem] border border-stone-200 bg-stone-50/90 p-4 sm:grid-cols-[1fr_0.9fr_auto]"
              onSubmit={(event) => {
                event.preventDefault();
                const principalId = Number(inspectFormPrincipalId);
                if (!Number.isFinite(principalId) || principalId <= 0) return;
                const form = new FormData(event.currentTarget);
                const scopedTenantId =
                  parseRequiredNumber(form.get('tenantId')) ?? currentTenant.id;
                setInspection({
                  principalId,
                  tenantId: scopedTenantId,
                });
              }}
            >
              <Field label={t('inspector.principalId')}>
                <input
                  name="principalId"
                  value={inspectFormPrincipalId}
                  list="iam-principal-directory"
                  onChange={(event) => setInspectFormPrincipalId(event.target.value)}
                  className={FIELD_CLASS_NAME}
                  placeholder="1001"
                />
              </Field>
              <Field label={t('inspector.tenant')}>
                <select
                  name="tenantId"
                  className={FIELD_CLASS_NAME}
                  defaultValue={inspection.tenantId || currentTenant.id}
                >
                  {(visibleTenants.data ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="sm:self-end">
                <Button
                  type="submit"
                  className="h-11 w-full rounded-2xl"
                  isLoading={
                    inspectedPrincipal.isLoading ||
                    inspectedMemberships.isLoading ||
                    inspectedRoles.isLoading ||
                    inspectedPermissions.isLoading
                  }
                >
                  {t('inspector.lookup')}
                </Button>
              </div>
            </form>

            {inspection.principalId ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-[1.6rem] border border-stone-200 bg-white p-4">
                  {inspectedPrincipal.isLoading ? (
                    <LoadingBlock />
                  ) : inspectedPrincipal.data ? (
                    <div className="space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-4">
                          <IdentityAvatar
                            label={inspectedPrincipal.data.displayName}
                            avatarUrl={inspectedDirectoryEntry?.avatarUrl}
                            kind={inspectedKind}
                            className="size-14 rounded-[1.25rem]"
                          />
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-xl font-semibold text-stone-950">
                                {inspectedPrincipal.data.displayName}
                              </p>
                              <KindBadge
                                kind={inspectedKind}
                                humanLabel={t('shared.human')}
                                agentLabel={t('shared.agent')}
                              />
                              <StateBadge
                                active={inspectedPrincipal.data.isActive}
                                activeLabel={commonT('dashboard.active')}
                                inactiveLabel={commonT('dashboard.inactive')}
                              />
                            </div>
                            <p className="mt-1 truncate text-sm text-stone-600">
                              {inspectedDirectoryEntry?.handle ??
                                `#${inspectedPrincipal.data.id}`}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-3">
                        <MetaBlock
                          label={t('members.principal')}
                          value={`#${inspectedPrincipal.data.id}`}
                        />
                        <MetaBlock
                          label={t('inspector.tenant')}
                          value={
                            inspectionTenant
                              ? inspectionTenant.name
                              : `#${inspection.tenantId}`
                          }
                        />
                        <MetaBlock
                          label={t('inspector.lastUpdated')}
                          value={dayjs(inspectedPrincipal.data.updatedAt).format(
                            'YYYY-MM-DD HH:mm',
                          )}
                        />
                      </div>
                    </div>
                  ) : (
                    <EmptyState>{t('inspector.empty')}</EmptyState>
                  )}
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="rounded-[1.6rem] border border-stone-200 bg-white p-4">
                    <p className="text-sm font-semibold text-stone-900">
                      {t('inspector.memberships')}
                    </p>
                    <div className="mt-3 space-y-2">
                      {inspectedMemberships.isLoading ? (
                        <LoadingBlock />
                      ) : inspectedMemberships.data &&
                        inspectedMemberships.data.length > 0 ? (
                        inspectedMemberships.data.map((entry) => (
                          <div
                            key={`${entry.tenant.id}-${entry.membership.principalId}`}
                            className="rounded-[1.2rem] border border-stone-200 bg-stone-50 px-3 py-3"
                          >
                            <p className="text-sm font-semibold text-stone-900">
                              {entry.tenant.name}
                            </p>
                            <p className="mt-1 text-xs uppercase tracking-[0.22em] text-stone-500">
                              {statusLabel(t, entry.membership.status)}
                            </p>
                          </div>
                        ))
                      ) : (
                        <EmptyInline>{t('inspector.noMemberships')}</EmptyInline>
                      )}
                    </div>
                  </div>

                  <div className="rounded-[1.6rem] border border-stone-200 bg-white p-4">
                    <p className="text-sm font-semibold text-stone-900">
                      {t('inspector.roles')}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {inspectedRoles.isLoading ? (
                        <LoadingBlock />
                      ) : inspectedRoles.data && inspectedRoles.data.length > 0 ? (
                        inspectedRoles.data.map((entry) => (
                          <span
                            key={entry.role.id}
                            className="rounded-full border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-700"
                          >
                            {entry.role.name}
                          </span>
                        ))
                      ) : (
                        <EmptyInline>{t('inspector.noRoles')}</EmptyInline>
                      )}
                    </div>
                  </div>

                  <div className="rounded-[1.6rem] border border-stone-200 bg-white p-4">
                    <p className="text-sm font-semibold text-stone-900">
                      {t('inspector.permissions')}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {inspectedPermissions.isLoading ? (
                        <LoadingBlock />
                      ) : inspectedPermissions.data?.permissionCodes &&
                        inspectedPermissions.data.permissionCodes.length > 0 ? (
                        inspectedPermissions.data.permissionCodes.map((code) => (
                          <span
                            key={code}
                            className="rounded-full border border-stone-200 bg-stone-50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-700"
                          >
                            {code}
                          </span>
                        ))
                      ) : (
                        <EmptyInline>{t('inspector.noPermissions')}</EmptyInline>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState className="mt-4">{t('inspector.empty')}</EmptyState>
            )}
          </SectionCard>

          <SectionCard
            id={SECTION_IDS.roles}
            title={t('roles.title')}
            description={t('roles.description')}
          >
            <div className="grid gap-4 xl:grid-cols-[0.88fr_1.12fr]">
              <div className="space-y-4">
                <form
                  className="space-y-3 rounded-[1.6rem] border border-stone-200 bg-stone-50/90 p-4"
                  onSubmit={handleRoleCreate}
                >
                  <SectionEyebrow>{t('roles.create')}</SectionEyebrow>
                  <Field label={t('roles.code')}>
                    <input name="code" className={FIELD_CLASS_NAME} required />
                  </Field>
                  <Field label={t('roles.name')}>
                    <input name="name" className={FIELD_CLASS_NAME} required />
                  </Field>
                  <Field label={t('roles.descriptionField')}>
                    <textarea name="description" className={TEXTAREA_CLASS_NAME} />
                  </Field>
                  <Button
                    type="submit"
                    className="h-11 w-full rounded-2xl"
                    isLoading={createRole.isPending}
                  >
                    {t('roles.create')}
                  </Button>
                </form>

                <div className="space-y-3">
                  {roles.isLoading ? (
                    <LoadingBlock />
                  ) : roles.data && roles.data.length > 0 ? (
                    roles.data.map((role) => (
                      <button
                        key={role.id}
                        type="button"
                        className={cn(
                          'w-full rounded-[1.5rem] border px-4 py-4 text-left transition',
                          role.id === selectedRoleId
                            ? 'border-stone-900 bg-stone-900 text-white'
                            : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50',
                        )}
                        onClick={() => setSelectedRoleId(role.id)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-base font-semibold">
                              {role.name}
                            </p>
                            <p
                              className={cn(
                                'mt-1 truncate text-xs uppercase tracking-[0.22em]',
                                role.id === selectedRoleId
                                  ? 'text-stone-300'
                                  : 'text-stone-500',
                              )}
                            >
                              {role.code}
                            </p>
                          </div>
                          <span
                            className={cn(
                              'rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]',
                              role.id === selectedRoleId
                                ? 'bg-white/15 text-white'
                                : 'bg-stone-100 text-stone-600',
                            )}
                          >
                            {role.isBuiltin ? t('roles.builtin') : t('roles.custom')}
                          </span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <EmptyState>{t('roles.empty')}</EmptyState>
                  )}
                </div>
              </div>

              <div className="rounded-[1.6rem] border border-stone-200 bg-white p-4">
                <SectionEyebrow>{t('roles.update')}</SectionEyebrow>
                {selectedRole ? (
                  <>
                    <form
                      key={`role-${selectedRole.id}`}
                      className="mt-4 space-y-4"
                      onSubmit={handleRoleUpdate}
                    >
                      <Field label={t('roles.code')}>
                        <input
                          name="code"
                          defaultValue={selectedRole.code}
                          className={FIELD_CLASS_NAME}
                          required
                        />
                      </Field>
                      <Field label={t('roles.name')}>
                        <input
                          name="name"
                          defaultValue={selectedRole.name}
                          className={FIELD_CLASS_NAME}
                          required
                        />
                      </Field>
                      <Field label={t('roles.descriptionField')}>
                        <textarea
                          name="description"
                          defaultValue={selectedRole.description ?? ''}
                          className={TEXTAREA_CLASS_NAME}
                        />
                      </Field>
                      <div className="flex flex-wrap gap-3">
                        <Button
                          type="submit"
                          className="h-11 rounded-2xl"
                          isLoading={updateRole.isPending}
                        >
                          {t('roles.update')}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={selectedRole.isBuiltin}
                          className="h-11 rounded-2xl border-red-300 bg-white text-red-700 hover:bg-red-50"
                          isLoading={deleteRole.isPending}
                          onClick={() => {
                            void deleteRole.mutateAsync({
                              tenantId: currentTenant.id,
                              roleId: selectedRole.id,
                            });
                          }}
                        >
                          {t('roles.delete')}
                        </Button>
                      </div>
                    </form>

                    <form
                      key={`role-permissions-${selectedRole.id}`}
                      className="mt-6 border-t border-stone-200 pt-6"
                      onSubmit={handleRolePermissionsReplace}
                    >
                      <p className="text-sm font-semibold text-stone-900">
                        {t('roles.permissionSet')}
                      </p>
                      <div className="mt-4 grid gap-2 sm:grid-cols-2">
                        {(permissions.data ?? []).map((permission) => {
                          const isChecked = Boolean(
                            selectedRole.permissions?.some(
                              (entry) => entry.id === permission.id,
                            ),
                          );

                          return (
                            <label
                              key={permission.id}
                              className="flex gap-3 rounded-[1.2rem] border border-stone-200 bg-stone-50 px-4 py-3"
                            >
                              <input
                                type="checkbox"
                                name="permissionIds"
                                value={permission.id}
                                defaultChecked={isChecked}
                                className="mt-1 size-4 rounded border-stone-300 text-primary focus:ring-primary"
                              />
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-medium text-stone-900">
                                  {permission.code}
                                </span>
                                <span className="mt-1 block text-xs uppercase tracking-[0.18em] text-stone-500">
                                  {permission.resourceType}/{permission.action}
                                </span>
                              </span>
                            </label>
                          );
                        })}
                      </div>
                      <Button
                        type="submit"
                        className="mt-4 h-11 rounded-2xl"
                        isLoading={replaceRolePermissions.isPending}
                      >
                        {t('roles.replacePermissions')}
                      </Button>
                    </form>
                  </>
                ) : (
                  <EmptyState className="mt-4">{t('roles.selectHint')}</EmptyState>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            id={SECTION_IDS.capabilities}
            title={t('permissions.title')}
            description={t('permissions.description')}
          >
            <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
              <div className="space-y-4">
                <form
                  className="space-y-3 rounded-[1.6rem] border border-stone-200 bg-stone-50/90 p-4"
                  onSubmit={handlePermissionCreate}
                >
                  <SectionEyebrow>{t('permissions.create')}</SectionEyebrow>
                  <Field label={t('permissions.code')}>
                    <input name="code" className={FIELD_CLASS_NAME} required />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label={t('permissions.resourceType')}>
                      <input name="resourceType" className={FIELD_CLASS_NAME} required />
                    </Field>
                    <Field label={t('permissions.action')}>
                      <input name="action" className={FIELD_CLASS_NAME} required />
                    </Field>
                  </div>
                  <Field label={t('permissions.descriptionField')}>
                    <textarea name="description" className={TEXTAREA_CLASS_NAME} />
                  </Field>
                  <Button
                    type="submit"
                    className="h-11 w-full rounded-2xl"
                    isLoading={createPermission.isPending}
                  >
                    {t('permissions.create')}
                  </Button>
                </form>

                <div className="space-y-3">
                  {permissions.isLoading ? (
                    <LoadingBlock />
                  ) : permissions.data && permissions.data.length > 0 ? (
                    permissions.data.map((permission) => (
                      <button
                        key={permission.id}
                        type="button"
                        className={cn(
                          'w-full rounded-[1.5rem] border px-4 py-4 text-left transition',
                          permission.id === selectedPermissionId
                            ? 'border-stone-900 bg-stone-900 text-white'
                            : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50',
                        )}
                        onClick={() => setSelectedPermissionId(permission.id)}
                      >
                        <p className="truncate text-base font-semibold">
                          {permission.code}
                        </p>
                        <p
                          className={cn(
                            'mt-1 truncate text-xs uppercase tracking-[0.22em]',
                            permission.id === selectedPermissionId
                              ? 'text-stone-300'
                              : 'text-stone-500',
                          )}
                        >
                          {permission.resourceType}/{permission.action}
                        </p>
                      </button>
                    ))
                  ) : (
                    <EmptyState>{t('permissions.empty')}</EmptyState>
                  )}
                </div>
              </div>

              <div className="rounded-[1.6rem] border border-stone-200 bg-white p-4">
                <SectionEyebrow>{t('permissions.update')}</SectionEyebrow>
                {selectedPermission ? (
                  <form
                    key={`permission-${selectedPermission.id}`}
                    className="mt-4 space-y-4"
                    onSubmit={handlePermissionUpdate}
                  >
                    <Field label={t('permissions.code')}>
                      <input
                        name="code"
                        defaultValue={selectedPermission.code}
                        className={FIELD_CLASS_NAME}
                        required
                      />
                    </Field>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label={t('permissions.resourceType')}>
                        <input
                          name="resourceType"
                          defaultValue={selectedPermission.resourceType}
                          className={FIELD_CLASS_NAME}
                          required
                        />
                      </Field>
                      <Field label={t('permissions.action')}>
                        <input
                          name="action"
                          defaultValue={selectedPermission.action}
                          className={FIELD_CLASS_NAME}
                          required
                        />
                      </Field>
                    </div>
                    <Field label={t('permissions.descriptionField')}>
                      <textarea
                        name="description"
                        defaultValue={selectedPermission.description ?? ''}
                        className={TEXTAREA_CLASS_NAME}
                      />
                    </Field>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        type="submit"
                        className="h-11 rounded-2xl"
                        isLoading={updatePermission.isPending}
                      >
                        {t('permissions.update')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 rounded-2xl border-red-300 bg-white text-red-700 hover:bg-red-50"
                        isLoading={deletePermission.isPending}
                        onClick={() => {
                          void deletePermission.mutateAsync({
                            permissionId: selectedPermission.id,
                          });
                        }}
                      >
                        {t('permissions.delete')}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <EmptyState className="mt-4">
                    {t('permissions.selectHint')}
                  </EmptyState>
                )}
              </div>
            </div>
          </SectionCard>

          <SectionCard
            id={SECTION_IDS.overrides}
            title={t('acl.title')}
            description={t('acl.description')}
          >
            <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="space-y-4">
                <form
                  className="space-y-3 rounded-[1.6rem] border border-stone-200 bg-stone-50/90 p-4"
                  onSubmit={handleAclCreate}
                >
                  <SectionEyebrow>{t('acl.create')}</SectionEyebrow>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label={t('acl.resourceType')}>
                      <input name="resourceType" className={FIELD_CLASS_NAME} required />
                    </Field>
                    <Field label={t('acl.resourceId')}>
                      <input
                        name="resourceId"
                        type="number"
                        className={FIELD_CLASS_NAME}
                        required
                      />
                    </Field>
                  </div>
                  <Field label={t('acl.permission')}>
                    <select name="permissionId" className={FIELD_CLASS_NAME} required defaultValue="">
                      <option value="">{t('shared.select')}</option>
                      {(permissions.data ?? []).map((permission) => (
                        <option key={permission.id} value={permission.id}>
                          {permission.code}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label={t('acl.subjectPrincipal')}>
                      <input
                        name="subjectPrincipalId"
                        type="number"
                        className={FIELD_CLASS_NAME}
                        placeholder={t('shared.none')}
                      />
                    </Field>
                    <Field label={t('acl.subjectRole')}>
                      <select name="subjectRoleId" className={FIELD_CLASS_NAME} defaultValue="">
                        <option value="">{t('shared.none')}</option>
                        {(roles.data ?? []).map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <Field label={t('acl.effect')}>
                    <select name="effect" className={FIELD_CLASS_NAME} defaultValue="allow">
                      <option value="allow">{t('acl.effect.allow')}</option>
                      <option value="deny">{t('acl.effect.deny')}</option>
                    </select>
                  </Field>
                  <Button
                    type="submit"
                    className="h-11 w-full rounded-2xl"
                    isLoading={createAclEntry.isPending}
                  >
                    {t('acl.create')}
                  </Button>
                </form>

                <div className="space-y-3">
                  {aclEntries.isLoading ? (
                    <LoadingBlock />
                  ) : aclEntries.data && aclEntries.data.length > 0 ? (
                    aclEntries.data.map((entry) => (
                      <button
                        key={entry.id}
                        type="button"
                        className={cn(
                          'w-full rounded-[1.5rem] border px-4 py-4 text-left transition',
                          entry.id === selectedAclId
                            ? 'border-stone-900 bg-stone-900 text-white'
                            : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50',
                        )}
                        onClick={() => setSelectedAclId(entry.id)}
                      >
                        <p className="text-base font-semibold">
                          {entry.resourceType} #{entry.resourceId}
                        </p>
                        <p
                          className={cn(
                            'mt-1 text-xs uppercase tracking-[0.22em]',
                            entry.id === selectedAclId
                              ? 'text-stone-300'
                              : 'text-stone-500',
                          )}
                        >
                          {entry.effect}
                        </p>
                      </button>
                    ))
                  ) : (
                    <EmptyState>{t('acl.empty')}</EmptyState>
                  )}
                </div>
              </div>

              <div className="rounded-[1.6rem] border border-stone-200 bg-white p-4">
                <SectionEyebrow>{t('acl.update')}</SectionEyebrow>
                {selectedAcl ? (
                  <form
                    key={`acl-${selectedAcl.id}`}
                    className="mt-4 space-y-4"
                    onSubmit={handleAclUpdate}
                  >
                    <div className="grid gap-3 text-xs uppercase tracking-[0.22em] text-stone-500 sm:grid-cols-2">
                      <MetaBlock
                        label={t('acl.resourceType')}
                        value={selectedAcl.resourceType}
                      />
                      <MetaBlock
                        label={t('acl.resourceId')}
                        value={String(selectedAcl.resourceId)}
                      />
                    </div>
                    <Field label={t('acl.permission')}>
                      <select
                        name="permissionId"
                        defaultValue={selectedAcl.permissionId}
                        className={FIELD_CLASS_NAME}
                        required
                      >
                        {(permissions.data ?? []).map((permission) => (
                          <option key={permission.id} value={permission.id}>
                            {permission.code}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label={t('acl.subjectPrincipal')}>
                        <input
                          name="subjectPrincipalId"
                          type="number"
                          defaultValue={selectedAcl.subjectPrincipalId ?? ''}
                          className={FIELD_CLASS_NAME}
                          placeholder={t('shared.none')}
                        />
                      </Field>
                      <Field label={t('acl.subjectRole')}>
                        <select
                          name="subjectRoleId"
                          defaultValue={selectedAcl.subjectRoleId ?? ''}
                          className={FIELD_CLASS_NAME}
                        >
                          <option value="">{t('shared.none')}</option>
                          {(roles.data ?? []).map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <Field label={t('acl.effect')}>
                      <select
                        name="effect"
                        defaultValue={selectedAcl.effect}
                        className={FIELD_CLASS_NAME}
                      >
                        <option value="allow">{t('acl.effect.allow')}</option>
                        <option value="deny">{t('acl.effect.deny')}</option>
                      </select>
                    </Field>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        type="submit"
                        className="h-11 rounded-2xl"
                        isLoading={updateAclEntry.isPending}
                      >
                        {t('acl.update')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 rounded-2xl border-red-300 bg-white text-red-700 hover:bg-red-50"
                        isLoading={deleteAclEntry.isPending}
                        onClick={() => {
                          void deleteAclEntry.mutateAsync({
                            tenantId: currentTenant.id,
                            aclId: selectedAcl.id,
                          });
                        }}
                      >
                        {t('acl.delete')}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <EmptyState className="mt-4">{t('acl.selectHint')}</EmptyState>
                )}
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
};

const SectionCard = ({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) => (
  <section
    id={id}
    className="scroll-mt-28 rounded-[2rem] border border-stone-200 bg-white/90 p-5 shadow-[0_35px_100px_-70px_rgba(50,31,16,0.35)] sm:p-6"
  >
    <div className="max-w-2xl">
      <h3 className="text-[1.7rem] font-semibold tracking-tight text-stone-950">
        {title}
      </h3>
      <p className="mt-1.5 text-sm leading-6 text-stone-600">{description}</p>
    </div>
    <div className="mt-5">{children}</div>
  </section>
);

const SectionEyebrow = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-500">
    {children}
  </p>
);

const Field = ({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) => (
  <label className="block">
    <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
      {label}
    </span>
    {children}
  </label>
);

const StatCard = ({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) => (
  <div className="bg-white px-5 py-5">
    <div className="flex items-center gap-3 text-primary">
      <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10">
        <Icon className="size-4" />
      </div>
      <span className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
        {label}
      </span>
    </div>
    <p className="mt-4 text-3xl font-semibold text-stone-950">{value}</p>
  </div>
);

const StateBadge = ({
  active,
  activeLabel,
  inactiveLabel,
  inverted = false,
}: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
  inverted?: boolean;
}) => (
  <span
    className={cn(
      'rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em]',
      active
        ? inverted
          ? 'bg-emerald-400/15 text-emerald-200'
          : 'bg-emerald-100 text-emerald-700'
        : inverted
          ? 'bg-white/15 text-stone-200'
          : 'bg-stone-100 text-stone-600',
    )}
  >
    {active ? activeLabel : inactiveLabel}
  </span>
);

const SectionJumpLink = ({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
}) => (
  <a
    href={href}
    className="inline-flex items-center gap-2 rounded-full border border-stone-300 bg-white/80 px-3.5 py-2 text-xs font-semibold text-stone-700 shadow-sm transition hover:border-stone-400 hover:bg-white"
  >
    <Icon className="size-3.5" />
    <span>{label}</span>
  </a>
);

const MetaBlock = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="rounded-[1.2rem] bg-stone-50 px-4 py-4">
    <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-500">
      {label}
    </p>
    <p className="mt-2 text-sm font-semibold text-stone-900">{value}</p>
  </div>
);

const IdentityAvatar = ({
  label,
  avatarUrl,
  kind,
  icon: Icon,
  className,
}: {
  label: string;
  avatarUrl?: string;
  kind?: PrincipalDirectoryEntry['kind'];
  icon?: LucideIcon;
  className?: string;
}) => {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={label}
        className={cn('size-11 rounded-2xl object-cover', className)}
      />
    );
  }

  const FallbackIcon = Icon ?? (kind === 'agent' ? Bot : Users);

  return (
    <div
      aria-hidden="true"
      className={cn(
        'flex size-11 items-center justify-center rounded-2xl bg-stone-100 text-stone-700',
        className,
      )}
    >
      <FallbackIcon className="size-4" />
    </div>
  );
};

const KindBadge = ({
  kind,
  humanLabel,
  agentLabel,
  inverted = false,
}: {
  kind: PrincipalDirectoryEntry['kind'];
  humanLabel: string;
  agentLabel: string;
  inverted?: boolean;
}) => {
  const Icon = kind === 'agent' ? Bot : Users;
  const label = kind === 'agent' ? agentLabel : humanLabel;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium',
        inverted ? 'bg-white/15 text-white' : 'bg-stone-100 text-stone-600',
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </span>
  );
};

const SummaryPanel = ({
  label,
  title,
  subtitle,
  avatarUrl,
  kind,
  icon,
  badge,
}: {
  label: string;
  title: string;
  subtitle: string;
  avatarUrl?: string;
  kind?: PrincipalDirectoryEntry['kind'];
  icon?: LucideIcon;
  badge?: React.ReactNode;
}) => (
  <div className="rounded-[1.6rem] border border-white/70 bg-white/80 p-4 shadow-sm backdrop-blur">
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <IdentityAvatar
          label={title}
          avatarUrl={avatarUrl}
          kind={kind}
          icon={icon}
          className="size-12 rounded-[1.2rem]"
        />
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-stone-500">
            {label}
          </p>
          <p className="mt-1 truncate text-base font-semibold text-stone-950">
            {title}
          </p>
          <p className="truncate text-xs uppercase tracking-[0.18em] text-stone-500">
            {subtitle}
          </p>
        </div>
      </div>
      {badge}
    </div>
  </div>
);

const EmptyState = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      'rounded-[1.5rem] border border-dashed border-stone-300 bg-stone-50/80 px-4 py-8 text-center text-sm leading-6 text-stone-600',
      className,
    )}
  >
    {children}
  </div>
);

const EmptyInline = ({ children }: { children: React.ReactNode }) => (
  <p className="rounded-[1.2rem] border border-dashed border-stone-300 bg-stone-50 px-3 py-4 text-sm text-stone-600">
    {children}
  </p>
);

const LoadingBlock = () => (
  <div className="flex justify-center py-8">
    <Spinner />
  </div>
);
