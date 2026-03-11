import { Layers3, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

import {
  useCreateTenantRole,
  useDeleteTenantRole,
  useReplaceTenantRolePermissions,
  useTenantRoles,
  useUpdateTenantRole,
} from '../api/access';
import { usePermissions } from '../api/permissions';

import {
  parseOptionalString,
  readRequiredStringField,
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

export const RolesConsole = () => {
  const { t } = useTranslation('iam');
  const { t: commonT } = useTranslation('common');
  const viewer = useCurrentUser().data;
  const tenantId = viewer?.tenant.id ?? 0;

  const rolesQuery = useTenantRoles({
    tenantId,
    queryConfig: {
      enabled: Boolean(tenantId),
    },
  });
  const permissionsQuery = usePermissions({
    enabled: Boolean(viewer),
  });

  const createRole = useCreateTenantRole();
  const updateRole = useUpdateTenantRole();
  const deleteRole = useDeleteTenantRole();
  const replaceRolePermissions = useReplaceTenantRolePermissions();

  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [roleSearch, setRoleSearch] = useState('');
  const [permissionSearch, setPermissionSearch] = useState('');

  const roles = rolesQuery.data ?? EMPTY_LIST;
  const permissions = permissionsQuery.data ?? EMPTY_LIST;

  useEffect(() => {
    if (!roles.length) {
      setSelectedRoleId(null);
      return;
    }

    if (!roles.some((role) => role.id === selectedRoleId)) {
      setSelectedRoleId(roles[0].id);
    }
  }, [roles, selectedRoleId]);

  const filteredRoles = useMemo(() => {
    const normalizedQuery = roleSearch.trim().toLowerCase();
    if (!normalizedQuery) return roles;

    return roles.filter((role) =>
      [role.name, role.code, role.description ?? '']
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [roleSearch, roles]);

  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? null;

  const permissionGroups = useMemo(() => {
    const selectedPermissionIds = new Set(
      selectedRole?.permissions?.map((permission) => permission.id) ?? [],
    );
    const normalizedQuery = permissionSearch.trim().toLowerCase();
    const visiblePermissions = permissions.filter((permission) => {
      if (!normalizedQuery) return true;

      return [permission.code, permission.resourceType, permission.action]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    });

    return Object.entries(
      visiblePermissions.reduce<Record<string, typeof visiblePermissions>>(
        (groups, permission) => {
          const key = permission.resourceType;
          groups[key] = [...(groups[key] ?? []), permission];
          return groups;
        },
        {},
      ),
    )
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([group, items]) => ({
        group,
        items: items.sort((left, right) => left.code.localeCompare(right.code)),
        selectedPermissionIds,
      }));
  }, [permissionSearch, permissions, selectedRole]);

  const handleCreateRole = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formElement = event.currentTarget;
    const code = readRequiredStringField(formElement, 'code');
    if (!code) return;
    const name = readRequiredStringField(formElement, 'name');
    if (!name) return;

    const form = new FormData(formElement);
    const created = await createRole.mutateAsync({
      tenantId,
      payload: {
        code,
        name,
        description: parseOptionalString(form.get('description')) ?? undefined,
      },
    });

    setSelectedRoleId(created.id);
    formElement.reset();
  };

  const handleUpdateRole = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedRole) return;

    const formElement = event.currentTarget;
    const code = readRequiredStringField(formElement, 'code');
    if (!code) return;
    const name = readRequiredStringField(formElement, 'name');
    if (!name) return;

    const form = new FormData(formElement);
    await updateRole.mutateAsync({
      tenantId,
      roleId: selectedRole.id,
      payload: {
        code,
        name,
        description: parseOptionalString(form.get('description')),
      },
    });
  };

  const handleReplacePermissions = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (!selectedRole) return;

    const form = new FormData(event.currentTarget);
    const permissionIds = form
      .getAll('permissionIds')
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value));

    await replaceRolePermissions.mutateAsync({
      tenantId,
      roleId: selectedRole.id,
      payload: { permissionIds },
    });
  };

  if (!viewer) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <AccessMetricCard
          icon={ShieldCheck}
          label={t('roles.title')}
          value={String(roles.length)}
          hint={t('roles.description')}
        />
        <AccessMetricCard
          icon={Layers3}
          label={t('roles.custom')}
          value={String(roles.filter((role) => !role.isBuiltin).length)}
          hint={selectedRole ? selectedRole.name : t('roles.empty')}
        />
        <AccessMetricCard
          icon={Sparkles}
          label={t('roles.permissionSet')}
          value={String(selectedRole?.permissions?.length ?? 0)}
          hint={selectedRole ? `${selectedRole.code}` : t('roles.selectHint')}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="space-y-6">
          <AccessCard>
            <AccessSectionHeader
              eyebrow={t('roles.title')}
              title={commonT('search')}
              description={t('roles.selectHint')}
            />
            <div className="relative mt-5">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-tertiary" />
              <input
                value={roleSearch}
                onChange={(event) => setRoleSearch(event.target.value)}
                placeholder={commonT('search')}
                className={cn(fieldClassName, 'pl-10')}
              />
            </div>
          </AccessCard>

          <AccessCard>
            <AccessSectionHeader
              eyebrow={t('roles.create')}
              title={t('roles.title')}
              description={t('roles.description')}
            />
            <form className="mt-5 space-y-4" onSubmit={handleCreateRole}>
              <AccessField label={t('roles.code')}>
                <input name="code" className={fieldClassName} required />
              </AccessField>
              <AccessField label={t('roles.name')}>
                <input name="name" className={fieldClassName} required />
              </AccessField>
              <AccessField label={t('roles.descriptionField')}>
                <textarea name="description" className={textareaClassName} />
              </AccessField>
              <Button
                type="submit"
                className="h-11 w-full rounded-md"
                isLoading={createRole.isPending}
              >
                {t('roles.create')}
              </Button>
            </form>
          </AccessCard>

          <AccessCard>
            <div className="flex items-center justify-between gap-3">
              <AccessSectionHeader
                title={t('roles.title')}
                description={`${filteredRoles.length} / ${roles.length}`}
              />
              {rolesQuery.isLoading ? <Spinner size="sm" /> : null}
            </div>
            <div className="mt-5 space-y-3">
              {filteredRoles.length > 0 ? (
                filteredRoles.map((role) => {
                  const isSelected = role.id === selectedRoleId;

                  return (
                    <button
                      key={role.id}
                      type="button"
                      className={cn(
                        'w-full rounded-xl border px-4 py-4 text-left transition duration-base ease-out',
                        isSelected
                          ? 'border-accent-soft-border bg-accent-soft-bg'
                          : 'border-border-default bg-surface-1 hover:bg-surface-3',
                      )}
                      onClick={() => setSelectedRoleId(role.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-body-l font-semibold text-primary">
                            {role.name}
                          </p>
                          <p
                            className={cn(
                              'mt-1 truncate text-micro font-semibold uppercase tracking-[0.22em]',
                              isSelected
                                ? 'text-accent-soft-text'
                                : 'text-tertiary',
                            )}
                          >
                            {role.code}
                          </p>
                        </div>
                        <AccessBadge
                          tone={role.isBuiltin ? 'accent' : 'neutral'}
                        >
                          {role.isBuiltin
                            ? t('roles.builtin')
                            : t('roles.custom')}
                        </AccessBadge>
                      </div>
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <p className="line-clamp-2 text-body-s leading-6 text-secondary">
                          {role.description || t('roles.selectHint')}
                        </p>
                        <AccessBadge tone="neutral">
                          {role.permissions?.length ?? 0}
                        </AccessBadge>
                      </div>
                    </button>
                  );
                })
              ) : (
                <AccessEmptyState>{t('roles.empty')}</AccessEmptyState>
              )}
            </div>
          </AccessCard>
        </div>

        <div className="space-y-6">
          {selectedRole ? (
            <>
              <AccessCard>
                <AccessSectionHeader
                  eyebrow={t('roles.update')}
                  title={selectedRole.name}
                  description={
                    selectedRole.description || t('roles.selectHint')
                  }
                  actions={
                    <>
                      <AccessBadge
                        tone={selectedRole.isBuiltin ? 'accent' : 'neutral'}
                      >
                        {selectedRole.isBuiltin
                          ? t('roles.builtin')
                          : t('roles.custom')}
                      </AccessBadge>
                      <AccessBadge tone="neutral">
                        {selectedRole.code}
                      </AccessBadge>
                    </>
                  }
                />

                <form
                  key={`role-${selectedRole.id}`}
                  className="mt-5 space-y-4"
                  onSubmit={handleUpdateRole}
                >
                  <div className="grid gap-4 lg:grid-cols-2">
                    <AccessField label={t('roles.code')}>
                      <input
                        name="code"
                        defaultValue={selectedRole.code}
                        className={fieldClassName}
                        required
                      />
                    </AccessField>
                    <AccessField label={t('roles.name')}>
                      <input
                        name="name"
                        defaultValue={selectedRole.name}
                        className={fieldClassName}
                        required
                      />
                    </AccessField>
                  </div>
                  <AccessField label={t('roles.descriptionField')}>
                    <textarea
                      name="description"
                      defaultValue={selectedRole.description ?? ''}
                      className={textareaClassName}
                    />
                  </AccessField>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="submit"
                      className="h-11 rounded-md"
                      isLoading={updateRole.isPending}
                    >
                      {t('roles.update')}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={selectedRole.isBuiltin}
                      className={dangerOutlineButtonClassName}
                      isLoading={deleteRole.isPending}
                      onClick={() => {
                        void deleteRole.mutateAsync({
                          tenantId,
                          roleId: selectedRole.id,
                        });
                      }}
                    >
                      {t('roles.delete')}
                    </Button>
                  </div>
                </form>
              </AccessCard>

              <AccessCard>
                <AccessSectionHeader
                  eyebrow={t('roles.permissionSet')}
                  title={t('permissions.title')}
                  description={t('permissions.description')}
                />
                <div className="relative mt-5">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-tertiary" />
                  <input
                    value={permissionSearch}
                    onChange={(event) =>
                      setPermissionSearch(event.target.value)
                    }
                    placeholder={commonT('search')}
                    className={cn(fieldClassName, 'pl-10')}
                  />
                </div>

                <form
                  key={`role-permissions-${selectedRole.id}`}
                  className="mt-5 space-y-5"
                  onSubmit={handleReplacePermissions}
                >
                  {permissionGroups.length > 0 ? (
                    permissionGroups.map(
                      ({ group, items, selectedPermissionIds }) => (
                        <div key={group} className="space-y-3">
                          <div className="flex items-center gap-3">
                            <h3 className="text-body-l font-semibold text-primary">
                              {group}
                            </h3>
                            <AccessBadge tone="neutral">
                              {items.length}
                            </AccessBadge>
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            {items.map((permission) => (
                              <label
                                key={permission.id}
                                className="flex items-start gap-3 rounded-xl border border-border-default bg-surface-1 px-4 py-4 transition duration-base ease-out hover:border-border-strong hover:bg-surface-3"
                              >
                                <input
                                  type="checkbox"
                                  name="permissionIds"
                                  value={permission.id}
                                  defaultChecked={selectedPermissionIds.has(
                                    permission.id,
                                  )}
                                  className="mt-1 size-4 rounded border-border-default text-accent focus:ring-accent"
                                />
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-mono text-body-s font-semibold text-primary">
                                      {permission.code}
                                    </p>
                                    <AccessBadge tone="accent">
                                      {permission.action}
                                    </AccessBadge>
                                  </div>
                                  <p className="mt-2 text-body-s leading-6 text-secondary">
                                    {permission.description ||
                                      permission.resourceType}
                                  </p>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      ),
                    )
                  ) : (
                    <AccessEmptyState>
                      {t('permissions.empty')}
                    </AccessEmptyState>
                  )}

                  <Button
                    type="submit"
                    className="h-11 rounded-md"
                    isLoading={replaceRolePermissions.isPending}
                  >
                    {t('roles.replacePermissions')}
                  </Button>
                </form>
              </AccessCard>
            </>
          ) : (
            <AccessEmptyState>{t('roles.selectHint')}</AccessEmptyState>
          )}
        </div>
      </div>
    </div>
  );
};
