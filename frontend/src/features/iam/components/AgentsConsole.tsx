import { Bot, Plus, Search, ShieldCheck, Sparkles } from 'lucide-react';
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import { useTranslation } from 'react-i18next';

import {
  useChangeAgentOwner,
  useCreateAgent,
  useDeleteAgent,
  useAgents,
  useSetAgentActive,
  useUpdateAgent,
} from '../api/agents';
import { useUsers } from '../api/list-users';

import {
  formatOptionalDate,
  parseOptionalNumber,
  parseOptionalString,
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

export const AgentsConsole = () => {
  const { t } = useTranslation('iam');
  const { t: commonT } = useTranslation('common');
  const viewer = useCurrentUser().data;
  const tenantId = viewer?.tenant.id ?? 0;

  const agentsQuery = useAgents({
    tenantId,
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

  const createAgent = useCreateAgent();
  const updateAgent = useUpdateAgent();
  const changeAgentOwner = useChangeAgentOwner();
  const setAgentActive = useSetAgentActive();
  const deleteAgent = useDeleteAgent();

  const [selectedAgentPrincipalId, setSelectedAgentPrincipalId] = useState<
    number | null
  >(null);
  const [agentSearch, setAgentSearch] = useState('');
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('edit');
  const deferredSearch = useDeferredValue(agentSearch);

  const agents = agentsQuery.data ?? EMPTY_LIST;
  const users = usersQuery.data ?? EMPTY_LIST;

  // Resolve owner labels once so the directory and detail panel never disagree.
  const ownerById = useMemo(
    () =>
      new Map(
        users.map((user) => [
          user.principalId,
          `${user.displayName} (@${user.username})`,
        ]),
      ),
    [users],
  );

  const ownerOptions = useMemo(
    () =>
      [...users]
        .map((user) => ({
          id: user.principalId,
          label: `${user.displayName} (@${user.username})`,
        }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    [users],
  );

  const filteredAgents = useMemo(() => {
    const normalizedQuery = deferredSearch.trim().toLowerCase();

    return [...agents]
      .filter((agent) => {
        const searchText = [
          agent.code,
          agent.displayName,
          agent.description,
          ownerById.get(agent.ownerPrincipalId ?? 0),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return !normalizedQuery || searchText.includes(normalizedQuery);
      })
      .sort((left, right) => left.displayName.localeCompare(right.displayName));
  }, [agents, deferredSearch, ownerById]);

  // Keep the detail editor attached to a visible directory item.
  useEffect(() => {
    if (agentsQuery.isLoading) {
      return;
    }

    if (!filteredAgents.length) {
      setSelectedAgentPrincipalId(null);
      setEditorMode('create');
      return;
    }

    if (
      !filteredAgents.some(
        (agent) => agent.principalId === selectedAgentPrincipalId,
      )
    ) {
      setSelectedAgentPrincipalId(filteredAgents[0].principalId);
      setEditorMode('edit');
    }
  }, [filteredAgents, selectedAgentPrincipalId, agentsQuery.isLoading]);

  const selectedAgent =
    agents.find((agent) => agent.principalId === selectedAgentPrincipalId) ??
    null;

  const handleCreateAgent = async (event: FormEvent<HTMLFormElement>) => {
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
    setEditorMode('edit');
    event.currentTarget.reset();
  };

  const handleUpdateAgent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedAgent) return;

    const form = new FormData(event.currentTarget);

    // Agent profile, owner, and activity state are separate backend resources.
    await Promise.all([
      updateAgent.mutateAsync({
        principalId: selectedAgent.principalId,
        payload: {
          displayName: parseRequiredString(form.get('displayName')),
          description: parseOptionalString(form.get('description')),
          avatarUrl: parseOptionalString(form.get('avatarUrl')) ?? undefined,
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

  if (!viewer) {
    return null;
  }

  const activeAgents = agents.filter((agent) => agent.isActive).length;
  const assignedOwners = agents.filter(
    (agent) => agent.ownerPrincipalId,
  ).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <AccessMetricCard
          icon={Bot}
          label={t('agents.title')}
          value={String(agents.length)}
          hint={t('agents.description')}
        />
        <AccessMetricCard
          icon={ShieldCheck}
          label={t('agents.active')}
          value={String(activeAgents)}
          hint={t('agents.selectHint')}
        />
        <AccessMetricCard
          icon={Sparkles}
          label={t('agents.owner')}
          value={String(assignedOwners)}
          hint={viewer.tenant.name}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[24rem_minmax(0,1fr)]">
        <AccessCard className="flex min-h-[32rem] flex-col overflow-hidden xl:h-[34rem] xl:max-h-[34rem]">
          <AccessSectionHeader
            eyebrow={t('agents.title')}
            title={t('agents.directoryTitle')}
            description={t('agents.directoryHint')}
            actions={
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-md"
                onClick={() => setEditorMode('create')}
              >
                <Plus className="mr-2 size-4" />
                {t('agents.create')}
              </Button>
            }
          />

          <div className="relative mt-5">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-tertiary" />
            <input
              value={agentSearch}
              onChange={(event) => setAgentSearch(event.target.value)}
              placeholder={commonT('search')}
              className={cn(fieldClassName, 'pl-10')}
            />
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <p className="text-body-s text-secondary">
              {t('agents.directoryCount', {
                shown: filteredAgents.length,
                total: agents.length,
              })}
            </p>
            {agentsQuery.isLoading ? <Spinner size="sm" /> : null}
          </div>

          {/* Keep the list height bounded so long agent registries do not bury the editor. */}
          <div className="mt-4 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1">
            {filteredAgents.length > 0 ? (
              filteredAgents.map((agent) => {
                const isSelected =
                  agent.principalId === selectedAgentPrincipalId;

                return (
                  <button
                    key={agent.principalId}
                    type="button"
                    className={cn(
                      'w-full rounded-xl border px-4 py-4 text-left transition duration-base ease-out',
                      isSelected
                        ? 'border-accent-soft-border bg-accent-soft-bg'
                        : 'border-border-default bg-surface-1 hover:bg-surface-3',
                    )}
                    onClick={() => {
                      setSelectedAgentPrincipalId(agent.principalId);
                      setEditorMode('edit');
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-body-l font-semibold text-primary">
                          {agent.displayName}
                        </p>
                        <p
                          className={cn(
                            'mt-1 truncate text-micro font-semibold uppercase tracking-[0.22em]',
                            isSelected
                              ? 'text-accent-soft-text'
                              : 'text-tertiary',
                          )}
                        >
                          {agent.code}
                        </p>
                      </div>
                      <AccessBadge
                        tone={agent.isActive ? 'success' : 'neutral'}
                      >
                        {agent.isActive
                          ? commonT('dashboard.active')
                          : commonT('dashboard.inactive')}
                      </AccessBadge>
                    </div>
                    <p className="mt-3 line-clamp-2 text-body-s leading-6 text-secondary">
                      {agent.description ||
                        ownerById.get(agent.ownerPrincipalId ?? 0) ||
                        t('agents.unowned')}
                    </p>
                  </button>
                );
              })
            ) : (
              <AccessEmptyState>{t('agents.empty')}</AccessEmptyState>
            )}
          </div>
        </AccessCard>

        <AccessCard className="min-h-[32rem] xl:h-[34rem] xl:max-h-[34rem] xl:overflow-y-auto">
          {editorMode === 'create' ? (
            <>
              <AccessSectionHeader
                eyebrow={t('agents.create')}
                title={t('agents.createTitle')}
                description={t('agents.createHint')}
              />
              <form className="mt-5 space-y-4" onSubmit={handleCreateAgent}>
                <div className="grid gap-4 lg:grid-cols-2">
                  <AccessField label={t('agents.code')}>
                    <input name="code" className={fieldClassName} required />
                  </AccessField>
                  <AccessField label={t('agents.displayName')}>
                    <input
                      name="displayName"
                      className={fieldClassName}
                      required
                    />
                  </AccessField>
                </div>
                <AccessField label={t('agents.descriptionField')}>
                  <textarea name="description" className={textareaClassName} />
                </AccessField>
                <div className="grid gap-4 lg:grid-cols-2">
                  <AccessField label={t('agents.avatarUrl')}>
                    <input
                      name="avatarUrl"
                      type="url"
                      className={fieldClassName}
                    />
                  </AccessField>
                  <AccessField label={t('agents.owner')}>
                    <select
                      name="ownerPrincipalId"
                      defaultValue=""
                      className={fieldClassName}
                    >
                      <option value="">{t('agents.unowned')}</option>
                      {ownerOptions.map((owner) => (
                        <option key={owner.id} value={owner.id}>
                          {owner.label}
                        </option>
                      ))}
                    </select>
                  </AccessField>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="submit"
                    className="h-11 rounded-md"
                    isLoading={createAgent.isPending}
                  >
                    {t('agents.create')}
                  </Button>
                  {selectedAgent ? (
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
          ) : selectedAgent ? (
            <>
              <AccessSectionHeader
                eyebrow={t('agents.update')}
                title={selectedAgent.displayName}
                description={
                  selectedAgent.description || t('agents.selectHint')
                }
                actions={
                  <>
                    <AccessBadge tone="neutral">
                      {selectedAgent.code}
                    </AccessBadge>
                    <AccessBadge
                      tone={selectedAgent.isActive ? 'success' : 'neutral'}
                    >
                      {selectedAgent.isActive
                        ? commonT('dashboard.active')
                        : commonT('dashboard.inactive')}
                    </AccessBadge>
                  </>
                }
              />

              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-border-default bg-surface-1 p-4">
                  <p className="text-micro font-semibold uppercase tracking-[0.22em] text-tertiary">
                    {t('agents.owner')}
                  </p>
                  <p className="mt-2 text-body-l font-semibold text-primary">
                    {ownerById.get(selectedAgent.ownerPrincipalId ?? 0) ||
                      t('agents.unowned')}
                  </p>
                </div>
                <div className="rounded-xl border border-border-default bg-surface-1 p-4">
                  <p className="text-micro font-semibold uppercase tracking-[0.22em] text-tertiary">
                    {commonT('created')}
                  </p>
                  <p className="mt-2 text-body-l font-semibold text-primary">
                    {formatOptionalDate(selectedAgent.createdAt)}
                  </p>
                </div>
                <div className="rounded-xl border border-border-default bg-surface-1 p-4">
                  <p className="text-micro font-semibold uppercase tracking-[0.22em] text-tertiary">
                    {commonT('updated')}
                  </p>
                  <p className="mt-2 text-body-l font-semibold text-primary">
                    {formatOptionalDate(selectedAgent.updatedAt)}
                  </p>
                </div>
              </div>

              <form
                key={`agent-${selectedAgent.principalId}`}
                className="mt-5 space-y-4"
                onSubmit={handleUpdateAgent}
              >
                <AccessField label={t('agents.displayName')}>
                  <input
                    name="displayName"
                    defaultValue={selectedAgent.displayName}
                    className={fieldClassName}
                    required
                  />
                </AccessField>
                <AccessField label={t('agents.descriptionField')}>
                  <textarea
                    name="description"
                    defaultValue={selectedAgent.description ?? ''}
                    className={textareaClassName}
                  />
                </AccessField>
                <div className="grid gap-4 lg:grid-cols-2">
                  <AccessField label={t('agents.avatarUrl')}>
                    <input
                      name="avatarUrl"
                      type="url"
                      defaultValue={selectedAgent.avatarUrl ?? ''}
                      className={fieldClassName}
                    />
                  </AccessField>
                  <AccessField label={t('agents.owner')}>
                    <select
                      name="ownerPrincipalId"
                      defaultValue={selectedAgent.ownerPrincipalId ?? ''}
                      className={fieldClassName}
                    >
                      <option value="">{t('agents.unowned')}</option>
                      {ownerOptions.map((owner) => (
                        <option key={owner.id} value={owner.id}>
                          {owner.label}
                        </option>
                      ))}
                    </select>
                  </AccessField>
                </div>
                <label className="flex items-start gap-3 rounded-xl border border-border-default bg-surface-1 px-4 py-3">
                  <input
                    type="checkbox"
                    name="isActive"
                    defaultChecked={selectedAgent.isActive}
                    className="mt-1 size-4 rounded border-border-default text-accent focus:ring-accent"
                  />
                  <div>
                    <p className="text-body-s font-semibold text-primary">
                      {t('agents.active')}
                    </p>
                    <p className="mt-1 text-body-s text-secondary">
                      {t('agents.directoryHint')}
                    </p>
                  </div>
                </label>
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="submit"
                    className="h-11 rounded-md"
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
                    className={dangerOutlineButtonClassName}
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
            </>
          ) : (
            <AccessEmptyState>{t('agents.selectHint')}</AccessEmptyState>
          )}
        </AccessCard>
      </div>
    </div>
  );
};
