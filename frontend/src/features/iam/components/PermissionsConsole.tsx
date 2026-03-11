import { KeyRound, Plus, Search, ShieldAlert, Sparkles } from 'lucide-react';
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import { useTranslation } from 'react-i18next';

import {
  useCreateAclEntry,
  useDeleteAclEntry,
  useTenantAclEntries,
  useTenantRoles,
  useUpdateAclEntry,
} from '../api/access';
import { useAgents } from '../api/agents';
import { useUsers } from '../api/list-users';
import {
  useCreatePermission,
  useDeletePermission,
  usePermissions,
  useUpdatePermission,
} from '../api/permissions';

import {
  formatOptionalDate,
  normalizeSearchText,
  parseOptionalNumber,
  parseOptionalString,
  parseRequiredNumber,
  parseRequiredString,
} from './access-console-utils';

import {
  AccessBadge,
  AccessCard,
  AccessEmptyState,
  AccessField,
  AccessMetricCard,
  AccessSectionHeader,
  dangerOutlineButtonClassName,
  fieldClassName,
  textareaClassName,
} from '@/components/admin/AccessPrimitives';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useCurrentUser } from '@/lib/auth';
import { cn } from '@/utils/cn';

const EMPTY_LIST: never[] = [];

export const PermissionsConsole = () => {
  const { t } = useTranslation('iam');
  const { t: commonT } = useTranslation('common');
  const viewer = useCurrentUser().data;
  const tenantId = viewer?.tenant.id ?? 0;

  const [selectedPermissionId, setSelectedPermissionId] = useState<
    number | null
  >(null);
  const [selectedAclId, setSelectedAclId] = useState<number | null>(null);
  const [permissionSearch, setPermissionSearch] = useState('');
  const [permissionResourceFilter, setPermissionResourceFilter] = useState('');
  const [overrideSearch, setOverrideSearch] = useState('');
  const [overrideResourceFilter, setOverrideResourceFilter] = useState('');
  const [overridePermissionFilter, setOverridePermissionFilter] = useState('');
  const [permissionEditorMode, setPermissionEditorMode] = useState<
    'create' | 'edit'
  >('edit');
  const [aclEditorMode, setAclEditorMode] = useState<'create' | 'edit'>('edit');

  const permissionsQuery = usePermissions({
    enabled: Boolean(viewer),
  });
  const selectedOverridePermissionId = overridePermissionFilter
    ? Number(overridePermissionFilter)
    : null;
  const aclEntriesQuery = useTenantAclEntries({
    tenantId,
    filters: {
      resourceType: overrideResourceFilter || null,
      permissionId: selectedOverridePermissionId,
    },
    queryConfig: {
      enabled: Boolean(tenantId),
    },
  });
  const usersQuery = useUsers({
    tenantId,
    queryConfig: {
      enabled: Boolean(tenantId),
    },
  });
  const agentsQuery = useAgents({
    tenantId,
    queryConfig: {
      enabled: Boolean(tenantId),
    },
  });
  const rolesQuery = useTenantRoles({
    tenantId,
    queryConfig: {
      enabled: Boolean(tenantId),
    },
  });

  const createPermission = useCreatePermission();
  const updatePermission = useUpdatePermission();
  const deletePermission = useDeletePermission();
  const createAclEntry = useCreateAclEntry();
  const updateAclEntry = useUpdateAclEntry();
  const deleteAclEntry = useDeleteAclEntry();

  const deferredPermissionSearch = useDeferredValue(permissionSearch);
  const deferredOverrideSearch = useDeferredValue(overrideSearch);

  const permissions = permissionsQuery.data ?? EMPTY_LIST;
  const aclEntries = aclEntriesQuery.data ?? EMPTY_LIST;
  const users = usersQuery.data ?? EMPTY_LIST;
  const agents = agentsQuery.data ?? EMPTY_LIST;
  const roles = rolesQuery.data ?? EMPTY_LIST;

  const permissionById = useMemo(
    () => new Map(permissions.map((permission) => [permission.id, permission])),
    [permissions],
  );
  const roleById = useMemo(
    () => new Map(roles.map((role) => [role.id, role])),
    [roles],
  );
  const principalOptions = useMemo(
    () =>
      [
        ...users.map((user) => ({
          id: user.principalId,
          label: `${user.displayName} (@${user.username})`,
        })),
        ...agents.map((agent) => ({
          id: agent.principalId,
          label: `${agent.displayName} (${agent.code})`,
        })),
      ].sort((left, right) => left.label.localeCompare(right.label)),
    [agents, users],
  );
  const principalById = useMemo(
    () => new Map(principalOptions.map((option) => [option.id, option])),
    [principalOptions],
  );

  const resourceTypes = useMemo(
    () =>
      Array.from(
        new Set(permissions.map((permission) => permission.resourceType)),
      ).sort((left, right) => left.localeCompare(right)),
    [permissions],
  );

  // Derive role and ACL usage once so the registry can explain permission blast radius.
  const permissionUsage = useMemo(() => {
    const roleCountByPermission = new Map<number, number>();
    const aclCountByPermission = new Map<number, number>();

    roles.forEach((role) => {
      role.permissions?.forEach((permission) => {
        roleCountByPermission.set(
          permission.id,
          (roleCountByPermission.get(permission.id) ?? 0) + 1,
        );
      });
    });

    aclEntries.forEach((entry) => {
      aclCountByPermission.set(
        entry.permissionId,
        (aclCountByPermission.get(entry.permissionId) ?? 0) + 1,
      );
    });

    return { roleCountByPermission, aclCountByPermission };
  }, [aclEntries, roles]);

  const filteredPermissions = useMemo(() => {
    const normalizedQuery = deferredPermissionSearch.trim().toLowerCase();

    return [...permissions]
      .filter((permission) => {
        const matchesResource =
          !permissionResourceFilter ||
          permission.resourceType === permissionResourceFilter;
        const matchesSearch =
          !normalizedQuery ||
          normalizeSearchText(
            permission.code,
            permission.resourceType,
            permission.action,
            permission.description,
          ).includes(normalizedQuery);

        return matchesResource && matchesSearch;
      })
      .sort((left, right) => {
        const resourceCompare = left.resourceType.localeCompare(
          right.resourceType,
        );
        if (resourceCompare !== 0) {
          return resourceCompare;
        }

        return left.code.localeCompare(right.code);
      });
  }, [deferredPermissionSearch, permissionResourceFilter, permissions]);

  const filteredAclEntries = useMemo(() => {
    const normalizedQuery = deferredOverrideSearch.trim().toLowerCase();

    return [...aclEntries]
      .filter((entry) => {
        const permission = permissionById.get(entry.permissionId);
        const principal = entry.subjectPrincipalId
          ? principalById.get(entry.subjectPrincipalId)
          : null;
        const role = entry.subjectRoleId
          ? roleById.get(entry.subjectRoleId)
          : null;

        return (
          !normalizedQuery ||
          normalizeSearchText(
            entry.resourceType,
            entry.resourceId,
            entry.effect,
            permission?.code,
            principal?.label,
            role?.name,
          ).includes(normalizedQuery)
        );
      })
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }, [
    aclEntries,
    deferredOverrideSearch,
    permissionById,
    principalById,
    roleById,
  ]);

  // Keep the right-side editor bound to the visible directory result.
  useEffect(() => {
    if (!filteredPermissions.length) {
      setSelectedPermissionId(null);
      setPermissionEditorMode('create');
      return;
    }

    if (
      !filteredPermissions.some(
        (permission) => permission.id === selectedPermissionId,
      )
    ) {
      setSelectedPermissionId(filteredPermissions[0].id);
    }
  }, [filteredPermissions, selectedPermissionId]);

  useEffect(() => {
    if (!filteredAclEntries.length) {
      setSelectedAclId(null);
      setAclEditorMode('create');
      return;
    }

    if (!filteredAclEntries.some((entry) => entry.id === selectedAclId)) {
      setSelectedAclId(filteredAclEntries[0].id);
    }
  }, [filteredAclEntries, selectedAclId]);

  const selectedPermission =
    permissions.find((permission) => permission.id === selectedPermissionId) ??
    null;
  const selectedAcl =
    aclEntries.find((entry) => entry.id === selectedAclId) ?? null;

  const handleCreatePermission = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const created = await createPermission.mutateAsync({
      code: parseRequiredString(form.get('code')),
      resourceType: parseRequiredString(form.get('resourceType')),
      action: parseRequiredString(form.get('action')),
      description: parseOptionalString(form.get('description')) ?? undefined,
    });

    setSelectedPermissionId(created.id);
    setPermissionEditorMode('edit');
    event.currentTarget.reset();
  };

  const handleUpdatePermission = async (event: FormEvent<HTMLFormElement>) => {
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

  const handleAclSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = new FormData(event.currentTarget);
    const resourceId = parseRequiredNumber(form.get('resourceId'));
    const permissionId = parseRequiredNumber(form.get('permissionId'));

    if (!resourceId || !permissionId) {
      return;
    }

    const payload = {
      resourceType: parseRequiredString(form.get('resourceType')),
      resourceId,
      permissionId,
      subjectPrincipalId: parseOptionalNumber(form.get('subjectPrincipalId')),
      subjectRoleId: parseOptionalNumber(form.get('subjectRoleId')),
      effect: parseRequiredString(form.get('effect')),
    };

    if (selectedAcl && aclEditorMode === 'edit') {
      await updateAclEntry.mutateAsync({
        tenantId,
        aclId: selectedAcl.id,
        payload: {
          permissionId: payload.permissionId,
          subjectPrincipalId: payload.subjectPrincipalId,
          subjectRoleId: payload.subjectRoleId,
          effect: payload.effect,
        },
      });
      return;
    }

    const created = await createAclEntry.mutateAsync({
      tenantId,
      payload,
    });
    setSelectedAclId(created.id);
    setAclEditorMode('edit');
    event.currentTarget.reset();
  };

  if (!viewer) {
    return null;
  }

  const selectedPermissionRoleCount = selectedPermission
    ? (permissionUsage.roleCountByPermission.get(selectedPermission.id) ?? 0)
    : 0;
  const selectedPermissionAclCount = selectedPermission
    ? (permissionUsage.aclCountByPermission.get(selectedPermission.id) ?? 0)
    : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <AccessMetricCard
          icon={KeyRound}
          label={t('permissions.title')}
          value={String(permissions.length)}
          hint={t('permissions.description')}
        />
        <AccessMetricCard
          icon={Sparkles}
          label={t('permissions.inRoles')}
          value={String(selectedPermissionRoleCount)}
          hint={selectedPermission?.code ?? t('permissions.selectHint')}
        />
        <AccessMetricCard
          icon={ShieldAlert}
          label={t('permissions.inOverrides')}
          value={String(selectedPermissionAclCount)}
          hint={selectedPermission?.resourceType ?? t('acl.description')}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[21rem_minmax(0,1fr)] xl:items-stretch">
        <AccessCard className="flex min-h-[32rem] flex-col overflow-hidden xl:h-[34rem] xl:max-h-[34rem]">
          <AccessSectionHeader
            eyebrow={t('permissions.title')}
            title={t('permissions.directoryTitle')}
            description={t('permissions.directoryDescription')}
            actions={
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-md"
                onClick={() => setPermissionEditorMode('create')}
              >
                <Plus className="mr-2 size-4" />
                {t('permissions.create')}
              </Button>
            }
          />

          <div className="mt-5 space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-tertiary" />
              <input
                value={permissionSearch}
                onChange={(event) => setPermissionSearch(event.target.value)}
                placeholder={commonT('search')}
                className={cn(fieldClassName, 'pl-10')}
              />
            </div>
            <select
              value={permissionResourceFilter}
              onChange={(event) =>
                setPermissionResourceFilter(event.target.value)
              }
              className={fieldClassName}
            >
              <option value="">{t('permissions.allResources')}</option>
              {resourceTypes.map((resourceType) => (
                <option key={resourceType} value={resourceType}>
                  {resourceType}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <p className="text-body-s text-secondary">
              {t('permissions.directoryCount', {
                shown: filteredPermissions.length,
                total: permissions.length,
              })}
            </p>
            {permissionsQuery.isLoading ? <Spinner size="sm" /> : null}
          </div>

          {/* Keep the directory intentionally shorter than the full page so long registries scroll inside the card. */}
          <div className="mt-4 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1">
            {filteredPermissions.length > 0 ? (
              filteredPermissions.map((permission) => {
                const isSelected = permission.id === selectedPermissionId;
                const roleCount =
                  permissionUsage.roleCountByPermission.get(permission.id) ?? 0;
                const aclCount =
                  permissionUsage.aclCountByPermission.get(permission.id) ?? 0;

                return (
                  <button
                    key={permission.id}
                    type="button"
                    className={cn(
                      'w-full rounded-xl border px-4 py-4 text-left transition duration-base ease-out',
                      isSelected
                        ? 'border-accent-soft-border bg-accent-soft-bg'
                        : 'border-border-default bg-surface-1 hover:bg-surface-3',
                    )}
                    onClick={() => {
                      setSelectedPermissionId(permission.id);
                      setPermissionEditorMode('edit');
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-mono text-body-s font-semibold text-primary">
                          {permission.code}
                        </p>
                        <p
                          className={cn(
                            'mt-2 text-micro font-semibold uppercase tracking-[0.22em]',
                            isSelected
                              ? 'text-accent-soft-text'
                              : 'text-tertiary',
                          )}
                        >
                          {permission.resourceType}
                        </p>
                      </div>
                      <AccessBadge tone="accent">
                        {permission.action}
                      </AccessBadge>
                    </div>
                    <p className="mt-3 line-clamp-2 text-body-s leading-6 text-secondary">
                      {permission.description || t('permissions.selectHint')}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <AccessBadge tone="neutral">
                        {t('permissions.roleCount', { count: roleCount })}
                      </AccessBadge>
                      <AccessBadge tone="neutral">
                        {t('permissions.overrideCount', { count: aclCount })}
                      </AccessBadge>
                    </div>
                  </button>
                );
              })
            ) : (
              <AccessEmptyState>{t('permissions.empty')}</AccessEmptyState>
            )}
          </div>
        </AccessCard>

        <AccessCard className="min-h-[32rem] xl:h-[34rem] xl:max-h-[34rem] xl:overflow-y-auto">
          {permissionEditorMode === 'create' ? (
            <>
              <AccessSectionHeader
                eyebrow={t('permissions.create')}
                title={t('permissions.editorCreateTitle')}
                description={t('permissions.editorCreateDescription')}
              />
              <form
                className="mt-5 space-y-4"
                onSubmit={handleCreatePermission}
              >
                <AccessField label={t('permissions.code')}>
                  <input name="code" className={fieldClassName} required />
                </AccessField>
                <div className="grid gap-4 lg:grid-cols-2">
                  <AccessField label={t('permissions.resourceType')}>
                    <input
                      name="resourceType"
                      defaultValue={permissionResourceFilter}
                      className={fieldClassName}
                      required
                    />
                  </AccessField>
                  <AccessField label={t('permissions.action')}>
                    <input name="action" className={fieldClassName} required />
                  </AccessField>
                </div>
                <AccessField label={t('permissions.descriptionField')}>
                  <textarea name="description" className={textareaClassName} />
                </AccessField>
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="submit"
                    className="h-11 rounded-md"
                    isLoading={createPermission.isPending}
                  >
                    {t('permissions.create')}
                  </Button>
                  {selectedPermission ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 rounded-md"
                      onClick={() => setPermissionEditorMode('edit')}
                    >
                      {commonT('cancel')}
                    </Button>
                  ) : null}
                </div>
              </form>
            </>
          ) : selectedPermission ? (
            <>
              <AccessSectionHeader
                eyebrow={t('permissions.update')}
                title={selectedPermission.code}
                description={
                  selectedPermission.description || t('permissions.selectHint')
                }
                actions={
                  <>
                    <AccessBadge tone="accent">
                      {selectedPermission.action}
                    </AccessBadge>
                    <AccessBadge tone="neutral">
                      {selectedPermission.resourceType}
                    </AccessBadge>
                  </>
                }
              />

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-border-default bg-surface-1 p-4">
                  <p className="text-micro font-semibold uppercase tracking-[0.22em] text-tertiary">
                    {t('permissions.inRoles')}
                  </p>
                  <p className="mt-2 text-title-3 text-primary">
                    {selectedPermissionRoleCount}
                  </p>
                </div>
                <div className="rounded-xl border border-border-default bg-surface-1 p-4">
                  <p className="text-micro font-semibold uppercase tracking-[0.22em] text-tertiary">
                    {t('permissions.inOverrides')}
                  </p>
                  <p className="mt-2 text-title-3 text-primary">
                    {selectedPermissionAclCount}
                  </p>
                </div>
                <div className="rounded-xl border border-border-default bg-surface-1 p-4">
                  <p className="text-micro font-semibold uppercase tracking-[0.22em] text-tertiary">
                    {commonT('updated')}
                  </p>
                  <p className="mt-2 text-body-l font-semibold text-primary">
                    {formatOptionalDate(selectedPermission.updatedAt)}
                  </p>
                </div>
              </div>

              <form
                key={`permission-${selectedPermission.id}`}
                className="mt-5 space-y-4"
                onSubmit={handleUpdatePermission}
              >
                <AccessField label={t('permissions.code')}>
                  <input
                    name="code"
                    defaultValue={selectedPermission.code}
                    className={fieldClassName}
                    required
                  />
                </AccessField>
                <div className="grid gap-4 lg:grid-cols-2">
                  <AccessField label={t('permissions.resourceType')}>
                    <input
                      name="resourceType"
                      defaultValue={selectedPermission.resourceType}
                      className={fieldClassName}
                      required
                    />
                  </AccessField>
                  <AccessField label={t('permissions.action')}>
                    <input
                      name="action"
                      defaultValue={selectedPermission.action}
                      className={fieldClassName}
                      required
                    />
                  </AccessField>
                </div>
                <AccessField label={t('permissions.descriptionField')}>
                  <textarea
                    name="description"
                    defaultValue={selectedPermission.description ?? ''}
                    className={textareaClassName}
                  />
                </AccessField>
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="submit"
                    className="h-11 rounded-md"
                    isLoading={updatePermission.isPending}
                  >
                    {t('permissions.update')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className={dangerOutlineButtonClassName}
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
            </>
          ) : (
            <AccessEmptyState>{t('permissions.selectHint')}</AccessEmptyState>
          )}
        </AccessCard>
      </div>

      <div className="space-y-6">
        <AccessCard>
          <AccessSectionHeader
            eyebrow={t('acl.title')}
            title={t('acl.directoryTitle')}
            description={t('acl.directoryDescription')}
            actions={
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-md"
                onClick={() => setAclEditorMode('create')}
              >
                <Plus className="mr-2 size-4" />
                {t('acl.create')}
              </Button>
            }
          />
        </AccessCard>

        <div className="grid gap-6 xl:grid-cols-[24rem_minmax(0,1fr)]">
          <AccessCard className="flex min-h-[32rem] flex-col overflow-hidden xl:h-[34rem] xl:max-h-[34rem]">
            <div className="space-y-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-tertiary" />
                <input
                  value={overrideSearch}
                  onChange={(event) => setOverrideSearch(event.target.value)}
                  placeholder={commonT('search')}
                  className={cn(fieldClassName, 'pl-10')}
                />
              </div>
              <select
                value={overrideResourceFilter}
                onChange={(event) =>
                  setOverrideResourceFilter(event.target.value)
                }
                className={fieldClassName}
              >
                <option value="">{t('permissions.allResources')}</option>
                {resourceTypes.map((resourceType) => (
                  <option key={resourceType} value={resourceType}>
                    {resourceType}
                  </option>
                ))}
              </select>
              <select
                value={overridePermissionFilter}
                onChange={(event) =>
                  setOverridePermissionFilter(event.target.value)
                }
                className={fieldClassName}
              >
                <option value="">{t('acl.permission')}</option>
                {permissions.map((permission) => (
                  <option key={permission.id} value={permission.id}>
                    {permission.code}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <p className="text-body-s text-secondary">
                {t('acl.directoryCount', {
                  shown: filteredAclEntries.length,
                  total: aclEntries.length,
                })}
              </p>
              {aclEntriesQuery.isLoading ? <Spinner size="sm" /> : null}
            </div>

            <div className="mt-4 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1">
              {filteredAclEntries.length > 0 ? (
                filteredAclEntries.map((entry) => {
                  const isSelected = entry.id === selectedAclId;
                  const permission = permissionById.get(entry.permissionId);
                  const principal = entry.subjectPrincipalId
                    ? principalById.get(entry.subjectPrincipalId)
                    : null;
                  const role = entry.subjectRoleId
                    ? roleById.get(entry.subjectRoleId)
                    : null;

                  return (
                    <button
                      key={entry.id}
                      type="button"
                      className={cn(
                        'w-full rounded-xl border px-4 py-4 text-left transition duration-base ease-out',
                        isSelected
                          ? 'border-accent-soft-border bg-accent-soft-bg'
                          : 'border-border-default bg-surface-1 hover:bg-surface-3',
                      )}
                      onClick={() => {
                        setSelectedAclId(entry.id);
                        setAclEditorMode('edit');
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-body-l font-semibold text-primary">
                            {entry.resourceType} #{entry.resourceId}
                          </p>
                          <p
                            className={cn(
                              'mt-1 text-micro font-semibold uppercase tracking-[0.22em]',
                              isSelected
                                ? 'text-accent-soft-text'
                                : 'text-tertiary',
                            )}
                          >
                            {permission?.code ?? `#${entry.permissionId}`}
                          </p>
                        </div>
                        <AccessBadge
                          tone={entry.effect === 'deny' ? 'danger' : 'accent'}
                        >
                          {entry.effect}
                        </AccessBadge>
                      </div>
                      <p className="mt-3 line-clamp-2 text-body-s leading-6 text-secondary">
                        {principal?.label || role?.name || t('shared.none')}
                      </p>
                      <p className="mt-3 text-body-s text-tertiary">
                        {formatOptionalDate(entry.updatedAt)}
                      </p>
                    </button>
                  );
                })
              ) : (
                <AccessEmptyState>{t('acl.empty')}</AccessEmptyState>
              )}
            </div>
          </AccessCard>

          <AccessCard className="min-h-[32rem] xl:h-[34rem] xl:max-h-[34rem] xl:overflow-y-auto">
            {aclEditorMode === 'create' || !selectedAcl ? (
              <>
                <AccessSectionHeader
                  eyebrow={t('acl.create')}
                  title={t('acl.editorCreateTitle')}
                  description={t('acl.editorCreateDescription')}
                />

                <form
                  key={`acl-create-${selectedPermission?.id ?? 'none'}`}
                  className="mt-5 space-y-4"
                  onSubmit={handleAclSubmit}
                >
                  <div className="grid gap-4 lg:grid-cols-2">
                    <AccessField label={t('acl.resourceType')}>
                      <input
                        name="resourceType"
                        defaultValue={selectedPermission?.resourceType ?? ''}
                        className={fieldClassName}
                        required
                      />
                    </AccessField>
                    <AccessField label={t('acl.resourceId')}>
                      <input
                        name="resourceId"
                        type="number"
                        min="1"
                        className={fieldClassName}
                        required
                      />
                    </AccessField>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <AccessField label={t('acl.permission')}>
                      <select
                        name="permissionId"
                        defaultValue={selectedPermission?.id ?? ''}
                        className={fieldClassName}
                        required
                      >
                        <option value="">{t('shared.select')}</option>
                        {permissions.map((permission) => (
                          <option key={permission.id} value={permission.id}>
                            {permission.code}
                          </option>
                        ))}
                      </select>
                    </AccessField>
                    <AccessField label={t('acl.effect')}>
                      <select
                        name="effect"
                        defaultValue="allow"
                        className={fieldClassName}
                        required
                      >
                        <option value="allow">{t('acl.effect.allow')}</option>
                        <option value="deny">{t('acl.effect.deny')}</option>
                      </select>
                    </AccessField>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <AccessField label={t('acl.subjectPrincipal')}>
                      <select
                        name="subjectPrincipalId"
                        defaultValue=""
                        className={fieldClassName}
                      >
                        <option value="">{t('shared.none')}</option>
                        {principalOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </AccessField>
                    <AccessField label={t('acl.subjectRole')}>
                      <select
                        name="subjectRoleId"
                        defaultValue=""
                        className={fieldClassName}
                      >
                        <option value="">{t('shared.none')}</option>
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </AccessField>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="submit"
                      className="h-11 rounded-md"
                      isLoading={createAclEntry.isPending}
                    >
                      {t('acl.create')}
                    </Button>
                    {selectedAcl ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 rounded-md"
                        onClick={() => setAclEditorMode('edit')}
                      >
                        {commonT('cancel')}
                      </Button>
                    ) : null}
                  </div>
                </form>
              </>
            ) : (
              <>
                <AccessSectionHeader
                  eyebrow={t('acl.update')}
                  title={`${selectedAcl.resourceType} #${selectedAcl.resourceId}`}
                  description={t('acl.selectHint')}
                  actions={
                    <AccessBadge
                      tone={selectedAcl.effect === 'deny' ? 'danger' : 'accent'}
                    >
                      {selectedAcl.effect}
                    </AccessBadge>
                  }
                />

                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-border-default bg-surface-1 p-4">
                    <p className="text-micro font-semibold uppercase tracking-[0.22em] text-tertiary">
                      {t('acl.permission')}
                    </p>
                    <p className="mt-2 text-body-l font-semibold text-primary">
                      {permissionById.get(selectedAcl.permissionId)?.code ??
                        `#${selectedAcl.permissionId}`}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border-default bg-surface-1 p-4">
                    <p className="text-micro font-semibold uppercase tracking-[0.22em] text-tertiary">
                      {t('acl.subject')}
                    </p>
                    <p className="mt-2 text-body-l font-semibold text-primary">
                      {selectedAcl.subjectPrincipalId
                        ? principalById.get(selectedAcl.subjectPrincipalId)
                            ?.label
                        : selectedAcl.subjectRoleId
                          ? roleById.get(selectedAcl.subjectRoleId)?.name
                          : t('shared.none')}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border-default bg-surface-1 p-4">
                    <p className="text-micro font-semibold uppercase tracking-[0.22em] text-tertiary">
                      {commonT('updated')}
                    </p>
                    <p className="mt-2 text-body-l font-semibold text-primary">
                      {formatOptionalDate(selectedAcl.updatedAt)}
                    </p>
                  </div>
                </div>

                <form
                  key={`acl-${selectedAcl.id}`}
                  className="mt-5 space-y-4"
                  onSubmit={handleAclSubmit}
                >
                  <div className="grid gap-4 lg:grid-cols-2">
                    <AccessField label={t('acl.resourceType')}>
                      <input
                        name="resourceType"
                        defaultValue={selectedAcl.resourceType}
                        className={fieldClassName}
                        required
                      />
                    </AccessField>
                    <AccessField label={t('acl.resourceId')}>
                      <input
                        name="resourceId"
                        type="number"
                        min="1"
                        defaultValue={selectedAcl.resourceId}
                        className={fieldClassName}
                        required
                      />
                    </AccessField>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <AccessField label={t('acl.permission')}>
                      <select
                        name="permissionId"
                        defaultValue={selectedAcl.permissionId}
                        className={fieldClassName}
                        required
                      >
                        {permissions.map((permission) => (
                          <option key={permission.id} value={permission.id}>
                            {permission.code}
                          </option>
                        ))}
                      </select>
                    </AccessField>
                    <AccessField label={t('acl.effect')}>
                      <select
                        name="effect"
                        defaultValue={selectedAcl.effect}
                        className={fieldClassName}
                        required
                      >
                        <option value="allow">{t('acl.effect.allow')}</option>
                        <option value="deny">{t('acl.effect.deny')}</option>
                      </select>
                    </AccessField>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-2">
                    <AccessField label={t('acl.subjectPrincipal')}>
                      <select
                        name="subjectPrincipalId"
                        defaultValue={selectedAcl.subjectPrincipalId ?? ''}
                        className={fieldClassName}
                      >
                        <option value="">{t('shared.none')}</option>
                        {principalOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </AccessField>
                    <AccessField label={t('acl.subjectRole')}>
                      <select
                        name="subjectRoleId"
                        defaultValue={selectedAcl.subjectRoleId ?? ''}
                        className={fieldClassName}
                      >
                        <option value="">{t('shared.none')}</option>
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </AccessField>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="submit"
                      className="h-11 rounded-md"
                      isLoading={updateAclEntry.isPending}
                    >
                      {t('acl.update')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className={dangerOutlineButtonClassName}
                      isLoading={deleteAclEntry.isPending}
                      onClick={() => {
                        void deleteAclEntry.mutateAsync({
                          tenantId,
                          aclId: selectedAcl.id,
                        });
                      }}
                    >
                      {t('acl.delete')}
                    </Button>
                  </div>
                </form>
              </>
            )}
          </AccessCard>
        </div>
      </div>
    </div>
  );
};
