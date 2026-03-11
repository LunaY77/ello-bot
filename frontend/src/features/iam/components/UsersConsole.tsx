import {
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import { useTranslation } from 'react-i18next';

import {
  useCreateTenantMembership,
  useDeleteTenantMembership,
  useGrantTenantRole,
  useRevokeTenantRole,
  useTenantMemberships,
  useTenantRoles,
  useUpdateTenantMembership,
} from '../api/access';
import { useUsers } from '../api/list-users';
import { usePrincipalPermissions, usePrincipalRoles } from '../api/principals';

import { formatOptionalDate } from './access-console-utils';

import {
  AccessBadge,
  AccessCard,
  AccessEmptyState,
  AccessField,
  AccessMetricCard,
  AccessSectionHeader,
  dangerOutlineButtonClassName,
  fieldClassName,
} from '@/components/admin/AccessPrimitives';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useCurrentUser } from '@/lib/auth';
import { cn } from '@/utils/cn';

const EMPTY_LIST: never[] = [];

const membershipToneByStatus = (
  status?: string | null,
): 'accent' | 'danger' | 'warning' | 'neutral' => {
  switch (status?.toLowerCase()) {
    case 'active':
      return 'accent';
    case 'invited':
      return 'warning';
    case 'suspended':
    case 'inactive':
      return 'danger';
    default:
      return 'neutral';
  }
};

const membershipLabel = (
  status: string | null | undefined,
  t: (key: string) => string,
) => {
  if (!status) {
    return t('users.noMembershipState');
  }

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

const SummaryCard = ({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
}) => (
  <div className="rounded-xl border border-border-default bg-surface-1 p-4">
    <div className="flex items-center gap-3">
      <div className="flex size-10 items-center justify-center rounded-md bg-accent-soft-bg text-accent-soft-text">
        <Icon className="size-4" />
      </div>
      <div>
        <p className="text-micro font-semibold uppercase tracking-[0.22em] text-tertiary">
          {label}
        </p>
        <p className="mt-1 text-title-3 text-primary">{value}</p>
      </div>
    </div>
    {hint ? (
      <p className="mt-3 text-body-s leading-6 text-secondary">{hint}</p>
    ) : null}
  </div>
);

export const UsersConsole = () => {
  const { t } = useTranslation('user');
  const { t: iamT } = useTranslation('iam');
  const { t: commonT } = useTranslation('common');
  const { data: viewer } = useCurrentUser();
  const tenantId = viewer?.tenant.id ?? 0;

  const usersQuery = useUsers({
    tenantId,
    queryConfig: {
      enabled: Boolean(tenantId),
    },
  });
  const membershipsQuery = useTenantMemberships({
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

  const updateMembership = useUpdateTenantMembership();
  const createMembership = useCreateTenantMembership();
  const deleteMembership = useDeleteTenantMembership();
  const grantRole = useGrantTenantRole();
  const revokeRole = useRevokeTenantRole();

  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [roleToAssign, setRoleToAssign] = useState('');
  const deferredSearch = useDeferredValue(search);

  const users = usersQuery.data ?? EMPTY_LIST;
  const memberships = membershipsQuery.data ?? EMPTY_LIST;
  const roles = rolesQuery.data ?? EMPTY_LIST;

  // Membership state belongs in the directory so operators can spot risky access without opening the detail pane.
  const membershipByPrincipalId = useMemo(
    () =>
      new Map(
        memberships.map((membership) => [membership.principalId, membership]),
      ),
    [memberships],
  );

  const filteredUsers = useMemo(() => {
    const normalizedQuery = deferredSearch.trim().toLowerCase();

    return [...users]
      .filter((user) => {
        const membership = membershipByPrincipalId.get(user.principalId);
        const searchText = [
          user.displayName,
          user.username,
          membership?.status,
          user.timezone,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return !normalizedQuery || searchText.includes(normalizedQuery);
      })
      .sort((left, right) => left.displayName.localeCompare(right.displayName));
  }, [deferredSearch, membershipByPrincipalId, users]);

  // Keep the detail pane pointed at a visible user after search and membership mutations.
  useEffect(() => {
    if (!filteredUsers.length) {
      setSelectedUserId(null);
      return;
    }

    if (!filteredUsers.some((user) => user.principalId === selectedUserId)) {
      setSelectedUserId(filteredUsers[0].principalId);
    }
  }, [filteredUsers, selectedUserId]);

  const selectedUser =
    users.find((user) => user.principalId === selectedUserId) ?? null;
  const selectedMembership = selectedUser
    ? (membershipByPrincipalId.get(selectedUser.principalId) ?? null)
    : null;

  const principalRolesQuery = usePrincipalRoles({
    principalId: selectedUserId ?? 0,
    tenantId,
    queryConfig: {
      enabled: Boolean(selectedUserId && tenantId),
    },
  });
  const principalPermissionsQuery = usePrincipalPermissions({
    principalId: selectedUserId ?? 0,
    tenantId,
    queryConfig: {
      enabled: Boolean(selectedUserId && tenantId),
    },
  });

  const assignedRoles =
    principalRolesQuery.data?.map((entry) => entry.role) ?? EMPTY_LIST;
  const assignedRoleIds = new Set(assignedRoles.map((role) => role.id));
  const availableRoles = roles.filter((role) => !assignedRoleIds.has(role.id));
  const effectivePermissions =
    principalPermissionsQuery.data?.permissionCodes ?? EMPTY_LIST;

  const handleMembershipSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedUser) return;

    const form = new FormData(event.currentTarget);
    const status = String(form.get('status') ?? 'active');

    if (selectedMembership) {
      await updateMembership.mutateAsync({
        tenantId,
        principalId: selectedUser.principalId,
        payload: { status },
      });
      return;
    }

    await createMembership.mutateAsync({
      tenantId,
      payload: {
        principalId: selectedUser.principalId,
        status,
      },
    });
  };

  const handleGrantRole = async () => {
    if (!selectedUser || !roleToAssign) return;

    await grantRole.mutateAsync({
      tenantId,
      principalId: selectedUser.principalId,
      roleId: Number(roleToAssign),
    });
    setRoleToAssign('');
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <AccessMetricCard
          icon={Users}
          label={t('users.title')}
          value={String(users.length)}
          hint={t('users.directoryHint')}
        />
        <AccessMetricCard
          icon={ShieldCheck}
          label={iamT('members.title')}
          value={String(memberships.length)}
          hint={selectedUser?.displayName ?? t('users.emptyDescription')}
        />
        <AccessMetricCard
          icon={Sparkles}
          label={iamT('inspector.permissions')}
          value={String(effectivePermissions.length)}
          hint={selectedUser?.displayName ?? t('users.permissionsHint')}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[24rem_minmax(0,1fr)]">
        <AccessCard className="h-fit xl:sticky xl:top-24">
          <AccessSectionHeader
            eyebrow={t('users.title')}
            title={t('users.directoryTitle')}
            description={t('users.directoryHint')}
          />

          <div className="relative mt-5">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-tertiary" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={commonT('search')}
              className={cn(fieldClassName, 'pl-10')}
            />
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <p className="text-body-s text-secondary">
              {t('users.directoryCount', {
                shown: filteredUsers.length,
                total: users.length,
              })}
            </p>
            {usersQuery.isLoading ? <Spinner size="sm" /> : null}
          </div>

          <div className="mt-4 space-y-3">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => {
                const isSelected = user.principalId === selectedUserId;
                const membership = membershipByPrincipalId.get(
                  user.principalId,
                );

                return (
                  <button
                    key={user.principalId}
                    type="button"
                    className={cn(
                      'w-full rounded-xl border px-4 py-4 text-left transition duration-base ease-out',
                      isSelected
                        ? 'border-accent-soft-border bg-accent-soft-bg'
                        : 'border-border-default bg-surface-1 hover:bg-surface-3',
                    )}
                    onClick={() => setSelectedUserId(user.principalId)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-body-l font-semibold text-primary">
                          {user.displayName}
                        </p>
                        <p
                          className={cn(
                            'mt-1 truncate text-micro font-semibold uppercase tracking-[0.22em]',
                            isSelected
                              ? 'text-accent-soft-text'
                              : 'text-tertiary',
                          )}
                        >
                          @{user.username}
                        </p>
                      </div>
                      <AccessBadge
                        tone={membershipToneByStatus(membership?.status)}
                      >
                        {membershipLabel(membership?.status, iamT)}
                      </AccessBadge>
                    </div>
                    <p className="mt-3 line-clamp-2 text-body-s leading-6 text-secondary">
                      {user.bio || t('users.emptyBio')}
                    </p>
                  </button>
                );
              })
            ) : (
              <AccessEmptyState>{t('users.emptyDescription')}</AccessEmptyState>
            )}
          </div>
        </AccessCard>

        {selectedUser ? (
          <div className="space-y-6">
            <AccessCard>
              <AccessSectionHeader
                eyebrow={t('profile.editEyebrow')}
                title={selectedUser.displayName}
                description={selectedUser.bio || t('users.permissionsHint')}
                actions={
                  <>
                    <AccessBadge
                      tone={selectedUser.isActive ? 'success' : 'neutral'}
                    >
                      {selectedUser.isActive
                        ? t('profile.active')
                        : t('profile.inactive')}
                    </AccessBadge>
                    <AccessBadge
                      tone={membershipToneByStatus(selectedMembership?.status)}
                    >
                      {membershipLabel(selectedMembership?.status, iamT)}
                    </AccessBadge>
                  </>
                }
              />

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <SummaryCard
                  icon={Users}
                  label={t('profile.username')}
                  value={`@${selectedUser.username}`}
                  hint={selectedUser.timezone || t('profile.emptyValue')}
                />
                <SummaryCard
                  icon={ShieldCheck}
                  label={commonT('created')}
                  value={formatOptionalDate(selectedUser.createdAt)}
                  hint={t('users.memberSince')}
                />
                <SummaryCard
                  icon={Sparkles}
                  label={commonT('updated')}
                  value={formatOptionalDate(selectedUser.updatedAt)}
                  hint={viewer?.tenant.name}
                />
              </div>
            </AccessCard>

            <AccessCard>
              <AccessSectionHeader
                eyebrow={iamT('members.title')}
                title={t('users.membershipTitle')}
                description={t('users.membershipHint')}
              />

              <form
                className="mt-5 space-y-4"
                onSubmit={handleMembershipSubmit}
              >
                <AccessField label={iamT('members.status')}>
                  <select
                    name="status"
                    defaultValue={selectedMembership?.status ?? 'active'}
                    className={fieldClassName}
                  >
                    <option value="active">
                      {iamT('members.status.active')}
                    </option>
                    <option value="invited">
                      {iamT('members.status.invited')}
                    </option>
                    <option value="suspended">
                      {iamT('members.status.suspended')}
                    </option>
                    <option value="inactive">
                      {iamT('members.status.inactive')}
                    </option>
                  </select>
                </AccessField>
                {!selectedMembership ? (
                  <p className="text-body-s text-secondary">
                    {t('users.noMembership')}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="submit"
                    className="h-11 rounded-md"
                    isLoading={
                      updateMembership.isPending || createMembership.isPending
                    }
                  >
                    {selectedMembership
                      ? iamT('members.save')
                      : t('users.addAccess')}
                  </Button>
                  {selectedMembership ? (
                    <Button
                      type="button"
                      variant="outline"
                      className={dangerOutlineButtonClassName}
                      isLoading={deleteMembership.isPending}
                      onClick={() => {
                        void deleteMembership.mutateAsync({
                          tenantId,
                          principalId: selectedUser.principalId,
                        });
                      }}
                    >
                      {iamT('members.remove')}
                    </Button>
                  ) : null}
                </div>
              </form>
            </AccessCard>

            <AccessCard>
              <AccessSectionHeader
                eyebrow={iamT('members.assignedRoles')}
                title={t('users.roleAssignmentsTitle')}
                description={iamT('members.selectHint')}
              />

              <div className="mt-5 flex flex-wrap gap-2">
                {assignedRoles.length > 0 ? (
                  assignedRoles.map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      className="inline-flex items-center gap-2 rounded-pill border border-border-default bg-surface-1 px-3 py-2 text-body-s text-primary transition hover:border-danger/40 hover:bg-danger-soft-bg hover:text-danger-soft-text"
                      onClick={() => {
                        void revokeRole.mutateAsync({
                          tenantId,
                          principalId: selectedUser.principalId,
                          roleId: role.id,
                        });
                      }}
                    >
                      {role.name}
                      <span className="text-tertiary">×</span>
                    </button>
                  ))
                ) : (
                  <AccessEmptyState>{iamT('members.noRoles')}</AccessEmptyState>
                )}
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                <select
                  value={roleToAssign}
                  onChange={(event) => setRoleToAssign(event.target.value)}
                  className={fieldClassName}
                >
                  <option value="">{iamT('shared.select')}</option>
                  {availableRoles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  className="h-11 rounded-md"
                  disabled={!roleToAssign}
                  isLoading={grantRole.isPending}
                  onClick={() => {
                    void handleGrantRole();
                  }}
                >
                  {iamT('members.assignRole')}
                </Button>
              </div>
            </AccessCard>

            <AccessCard>
              <AccessSectionHeader
                eyebrow={iamT('inspector.permissions')}
                title={t('users.effectivePermissionsTitle')}
                description={t('users.permissionsHint')}
              />
              <div className="mt-5 flex flex-wrap gap-2">
                {principalPermissionsQuery.isLoading ? (
                  <Spinner size="sm" />
                ) : effectivePermissions.length > 0 ? (
                  effectivePermissions.map((code) => (
                    <AccessBadge key={code} tone="accent">
                      {code}
                    </AccessBadge>
                  ))
                ) : (
                  <AccessEmptyState>
                    {t('users.noPermissions')}
                  </AccessEmptyState>
                )}
              </div>
            </AccessCard>
          </div>
        ) : (
          <AccessEmptyState>{t('users.emptyDescription')}</AccessEmptyState>
        )}
      </div>
    </div>
  );
};
