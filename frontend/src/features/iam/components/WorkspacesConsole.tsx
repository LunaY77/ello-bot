import { Building2, Plus, Search, Waypoints } from 'lucide-react';
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import { useTranslation } from 'react-i18next';

import { useSwitchTenant } from '../api/auth';
import {
  useCreateTenant,
  useDeleteTenant,
  useUpdateTenant,
  useVisibleTenants,
} from '../api/tenants';

import { readRequiredStringField } from './access-console-utils';

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

export const WorkspacesConsole = () => {
  const { t } = useTranslation('iam');
  const { t: commonT } = useTranslation('common');
  const viewer = useCurrentUser().data;
  const workspacesQuery = useVisibleTenants({
    enabled: Boolean(viewer),
  });
  const switchTenant = useSwitchTenant();
  const createTenant = useCreateTenant();
  const updateTenant = useUpdateTenant();
  const deleteTenant = useDeleteTenant();

  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | null>(
    null,
  );
  const [search, setSearch] = useState('');
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('edit');
  const deferredSearch = useDeferredValue(search);

  const workspaces = workspacesQuery.data ?? EMPTY_LIST;

  const filteredWorkspaces = useMemo(() => {
    const normalizedQuery = deferredSearch.trim().toLowerCase();

    return [...workspaces]
      .filter((workspace) => {
        const searchText = `${workspace.name} ${workspace.slug}`.toLowerCase();
        return !normalizedQuery || searchText.includes(normalizedQuery);
      })
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [deferredSearch, workspaces]);

  // Workspace create/update actions should always leave a valid record selected in the detail pane.
  useEffect(() => {
    if (workspacesQuery.isLoading) {
      return;
    }

    if (!filteredWorkspaces.length) {
      setSelectedWorkspaceId(null);
      setEditorMode('create');
      return;
    }

    if (
      !filteredWorkspaces.some(
        (workspace) => workspace.id === selectedWorkspaceId,
      )
    ) {
      setSelectedWorkspaceId(filteredWorkspaces[0].id);
      setEditorMode('edit');
    }
  }, [filteredWorkspaces, selectedWorkspaceId, workspacesQuery.isLoading]);

  const selectedWorkspace =
    workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ??
    null;
  const currentWorkspaceId = viewer?.tenant.id ?? null;

  const handleCreateWorkspace = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formElement = event.currentTarget;
    const name = readRequiredStringField(formElement, 'name');
    if (!name) return;
    const slug = readRequiredStringField(formElement, 'slug');
    if (!slug) return;

    const created = await createTenant.mutateAsync({
      name,
      slug,
    });

    setSelectedWorkspaceId(created.id);
    setEditorMode('edit');
    await switchTenant.mutateAsync({ tenantId: created.id });
    formElement.reset();
  };

  const handleUpdateWorkspace = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedWorkspace) return;

    const formElement = event.currentTarget;
    const name = readRequiredStringField(formElement, 'name');
    if (!name) return;
    const slug = readRequiredStringField(formElement, 'slug');
    if (!slug) return;

    const form = new FormData(formElement);
    await updateTenant.mutateAsync({
      tenantId: selectedWorkspace.id,
      payload: {
        name,
        slug,
        isActive: form.get('isActive') === 'on',
      },
    });
  };

  if (!viewer) {
    return null;
  }

  const activeCount = workspaces.filter(
    (workspace) => workspace.isActive,
  ).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <AccessMetricCard
          icon={Building2}
          label={t('workspace.title')}
          value={String(workspaces.length)}
          hint={t('workspace.directoryHint')}
        />
        <AccessMetricCard
          icon={Waypoints}
          label={t('workspace.active')}
          value={String(activeCount)}
          hint={viewer.tenant.name}
        />
        <AccessMetricCard
          icon={Plus}
          label={t('workspace.current')}
          value={viewer.tenant.name}
          hint={viewer.tenant.slug}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[24rem_minmax(0,1fr)]">
        <AccessCard className="h-fit xl:sticky xl:top-24">
          <AccessSectionHeader
            eyebrow={t('workspace.title')}
            title={t('workspace.directoryTitle')}
            description={t('workspace.directoryHint')}
            actions={
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-md"
                onClick={() => setEditorMode('create')}
              >
                <Plus className="mr-2 size-4" />
                {commonT('dashboard.createWorkspace')}
              </Button>
            }
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
              {t('workspace.directoryCount', {
                shown: filteredWorkspaces.length,
                total: workspaces.length,
              })}
            </p>
            {workspacesQuery.isLoading ? <Spinner size="sm" /> : null}
          </div>

          <div className="mt-4 space-y-3">
            {filteredWorkspaces.length > 0 ? (
              filteredWorkspaces.map((workspace) => {
                const isSelected = workspace.id === selectedWorkspaceId;
                const isCurrent = workspace.id === currentWorkspaceId;

                return (
                  <button
                    key={workspace.id}
                    type="button"
                    className={cn(
                      'w-full rounded-xl border px-4 py-4 text-left transition duration-base ease-out',
                      isSelected
                        ? 'border-accent-soft-border bg-accent-soft-bg'
                        : 'border-border-default bg-surface-1 hover:bg-surface-3',
                    )}
                    onClick={() => {
                      setSelectedWorkspaceId(workspace.id);
                      setEditorMode('edit');
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-body-l font-semibold text-primary">
                          {workspace.name}
                        </p>
                        <p
                          className={cn(
                            'mt-1 truncate text-micro font-semibold uppercase tracking-[0.22em]',
                            isSelected
                              ? 'text-accent-soft-text'
                              : 'text-tertiary',
                          )}
                        >
                          {workspace.slug}
                        </p>
                      </div>
                      <AccessBadge
                        tone={workspace.isActive ? 'success' : 'neutral'}
                      >
                        {workspace.isActive
                          ? commonT('dashboard.active')
                          : commonT('dashboard.inactive')}
                      </AccessBadge>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {isCurrent ? (
                        <AccessBadge tone="accent">
                          {t('workspace.currentBadge')}
                        </AccessBadge>
                      ) : null}
                      <AccessBadge tone="neutral">#{workspace.id}</AccessBadge>
                    </div>
                  </button>
                );
              })
            ) : (
              <AccessEmptyState>{t('workspace.empty')}</AccessEmptyState>
            )}
          </div>
        </AccessCard>

        <AccessCard>
          {editorMode === 'create' ? (
            <>
              <AccessSectionHeader
                eyebrow={commonT('dashboard.createWorkspace')}
                title={t('workspace.createTitle')}
                description={t('workspace.createHint')}
              />
              <form className="mt-5 space-y-4" onSubmit={handleCreateWorkspace}>
                <AccessField label={t('workspace.name')}>
                  <input name="name" className={fieldClassName} required />
                </AccessField>
                <AccessField label={t('workspace.slug')}>
                  <input name="slug" className={fieldClassName} required />
                </AccessField>
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="submit"
                    className="h-11 rounded-md"
                    isLoading={createTenant.isPending || switchTenant.isPending}
                  >
                    {commonT('dashboard.createWorkspace')}
                  </Button>
                  {selectedWorkspace ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 rounded-md"
                      onClick={() => setEditorMode('edit')}
                    >
                      {commonT('cancel')}
                    </Button>
                  ) : null}
                </div>
              </form>
            </>
          ) : selectedWorkspace ? (
            <>
              <AccessSectionHeader
                eyebrow={t('workspace.update')}
                title={selectedWorkspace.name}
                description={selectedWorkspace.slug}
                actions={
                  <>
                    {selectedWorkspace.id === currentWorkspaceId ? (
                      <AccessBadge tone="accent">
                        {t('workspace.currentBadge')}
                      </AccessBadge>
                    ) : null}
                    <AccessBadge
                      tone={selectedWorkspace.isActive ? 'success' : 'neutral'}
                    >
                      {selectedWorkspace.isActive
                        ? commonT('dashboard.active')
                        : commonT('dashboard.inactive')}
                    </AccessBadge>
                  </>
                }
              />

              <form
                key={`workspace-${selectedWorkspace.id}`}
                className="mt-5 space-y-4"
                onSubmit={handleUpdateWorkspace}
              >
                <AccessField label={t('workspace.name')}>
                  <input
                    name="name"
                    defaultValue={selectedWorkspace.name}
                    className={fieldClassName}
                    required
                  />
                </AccessField>
                <AccessField label={t('workspace.slug')}>
                  <input
                    name="slug"
                    defaultValue={selectedWorkspace.slug}
                    className={fieldClassName}
                    required
                  />
                </AccessField>
                <label className="flex items-start gap-3 rounded-xl border border-border-default bg-surface-1 px-4 py-3">
                  <input
                    type="checkbox"
                    name="isActive"
                    defaultChecked={selectedWorkspace.isActive}
                    className="mt-1 size-4 rounded border-border-default text-accent focus:ring-accent"
                  />
                  <div>
                    <p className="text-body-s font-semibold text-primary">
                      {t('workspace.active')}
                    </p>
                    <p className="mt-1 text-body-s text-secondary">
                      {t('workspace.activeHint')}
                    </p>
                  </div>
                </label>
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="submit"
                    className="h-11 rounded-md"
                    isLoading={updateTenant.isPending}
                  >
                    {commonT('save')}
                  </Button>
                  {selectedWorkspace.id !== currentWorkspaceId ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 rounded-md"
                      isLoading={switchTenant.isPending}
                      onClick={() => {
                        void switchTenant.mutateAsync({
                          tenantId: selectedWorkspace.id,
                        });
                      }}
                    >
                      {t('workspace.switchCurrent')}
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="outline"
                    className={dangerOutlineButtonClassName}
                    disabled={selectedWorkspace.id === currentWorkspaceId}
                    isLoading={deleteTenant.isPending}
                    onClick={() => {
                      void deleteTenant.mutateAsync({
                        tenantId: selectedWorkspace.id,
                      });
                    }}
                  >
                    {t('workspace.delete')}
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <AccessEmptyState>{t('workspace.empty')}</AccessEmptyState>
          )}
        </AccessCard>
      </div>
    </div>
  );
};
