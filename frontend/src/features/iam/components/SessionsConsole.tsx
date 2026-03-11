import dayjs from 'dayjs';
import {
  Clock3,
  LogOut,
  MonitorSmartphone,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  type SessionInfo,
  useAuthSessions,
  useLogoutAllSessions,
  useRevokeSession,
} from '../api/auth';

import {
  AccessBadge,
  AccessCard,
  AccessEmptyState,
  AccessMetricCard,
  AccessSectionHeader,
  dangerOutlineButtonClassName,
  fieldClassName,
} from '@/components/admin/AccessPrimitives';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useCurrentUser } from '@/lib/auth';
import { cn } from '@/utils/cn';
import {
  formatCompactDateTime,
  formatDate,
  getEmptyDisplayValue,
} from '@/utils/format';

const EMPTY_SESSIONS: SessionInfo[] = [];

const formatTimestamp = (value?: string | null) => {
  if (!value) return null;
  return formatDate(value);
};

const getSessionTitle = (session: SessionInfo, fallbackLabel: string) => {
  const normalized = session.userAgent.trim();
  if (!normalized) return fallbackLabel;

  return normalized.split(' ').slice(0, 3).join(' ');
};

const getSessionSearchText = (session: SessionInfo) =>
  [
    session.userAgent,
    session.ipAddress,
    String(session.id),
    String(session.tenantId),
  ]
    .join(' ')
    .toLowerCase();

export const SessionsConsole = () => {
  const { t } = useTranslation('common');
  const viewer = useCurrentUser().data;
  const sessionsQuery = useAuthSessions({
    enabled: Boolean(viewer),
  });
  const revokeSession = useRevokeSession();
  const logoutAllSessions = useLogoutAllSessions();

  const [search, setSearch] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(
    null,
  );
  const deferredSearch = useDeferredValue(search);

  // Sort by the freshest activity so the directory reflects the operator's mental model.
  const sessions = useMemo(() => {
    return [...(sessionsQuery.data ?? EMPTY_SESSIONS)].sort((left, right) => {
      const leftTimestamp = left.lastSeenAt ?? left.expiresAt;
      const rightTimestamp = right.lastSeenAt ?? right.expiresAt;
      return dayjs(rightTimestamp).valueOf() - dayjs(leftTimestamp).valueOf();
    });
  }, [sessionsQuery.data]);

  // Keep the detail pane bound to a real session after search or revoke updates.
  useEffect(() => {
    if (!sessions.length) {
      setSelectedSessionId(null);
      return;
    }

    if (!sessions.some((session) => session.id === selectedSessionId)) {
      setSelectedSessionId(sessions[0].id);
    }
  }, [selectedSessionId, sessions]);

  const filteredSessions = useMemo(() => {
    const normalizedQuery = deferredSearch.trim().toLowerCase();
    if (!normalizedQuery) return sessions;

    return sessions.filter((session) =>
      getSessionSearchText(session).includes(normalizedQuery),
    );
  }, [deferredSearch, sessions]);

  const selectedSession =
    sessions.find((session) => session.id === selectedSessionId) ?? null;
  const mostRecentSessionId = sessions[0]?.id ?? null;
  const workspaceCount = new Set(sessions.map((session) => session.tenantId))
    .size;
  const nextExpiry = sessions
    .map((session) => dayjs(session.expiresAt))
    .sort((left, right) => left.valueOf() - right.valueOf())[0];

  if (!viewer) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <AccessMetricCard
          icon={ShieldCheck}
          label={t('sessions.total')}
          value={String(sessions.length)}
          hint={t('sessions.totalHint')}
        />
        <AccessMetricCard
          icon={Clock3}
          label={t('sessions.nextExpiry')}
          value={
            nextExpiry
              ? formatCompactDateTime(nextExpiry.toDate())
              : getEmptyDisplayValue()
          }
          hint={
            nextExpiry ? formatDate(nextExpiry.toDate()) : t('sessions.empty')
          }
        />
        <AccessMetricCard
          icon={MonitorSmartphone}
          label={t('sessions.workspaceScope')}
          value={String(workspaceCount)}
          hint={viewer.tenant.name}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[24rem_minmax(0,1fr)]">
        <AccessCard className="h-fit xl:sticky xl:top-24">
          <AccessSectionHeader
            eyebrow={t('sessions.title')}
            title={t('sessions.directoryTitle')}
            description={t('sessions.directoryDescription')}
          />

          <div className="relative mt-5">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-tertiary" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('sessions.searchPlaceholder')}
              className={cn(fieldClassName, 'pl-10')}
            />
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <p className="text-body-s text-secondary">
              {t('sessions.directoryCount', {
                shown: filteredSessions.length,
                total: sessions.length,
              })}
            </p>
            {sessionsQuery.isLoading ? <Spinner size="sm" /> : null}
          </div>

          <div className="mt-4 space-y-3">
            {filteredSessions.length > 0 ? (
              filteredSessions.map((session) => {
                const isSelected = session.id === selectedSessionId;
                const lastSeen = formatTimestamp(session.lastSeenAt);

                return (
                  <button
                    key={session.id}
                    type="button"
                    className={cn(
                      'w-full rounded-xl border px-4 py-4 text-left transition duration-base ease-out',
                      isSelected
                        ? 'border-accent-soft-border bg-accent-soft-bg'
                        : 'border-border-default bg-surface-1 hover:bg-surface-3',
                    )}
                    onClick={() => setSelectedSessionId(session.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-body-l font-semibold text-primary">
                          {getSessionTitle(
                            session,
                            t('sessions.unknownClient'),
                          )}
                        </p>
                        <p
                          className={cn(
                            'mt-1 text-micro font-semibold uppercase tracking-[0.22em]',
                            isSelected
                              ? 'text-accent-soft-text'
                              : 'text-tertiary',
                          )}
                        >
                          {session.ipAddress || t('sessions.unknownIp')}
                        </p>
                      </div>
                      {session.id === mostRecentSessionId ? (
                        <AccessBadge tone="accent">
                          {t('sessions.mostRecent')}
                        </AccessBadge>
                      ) : null}
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3 text-body-s text-secondary">
                      <span>
                        {lastSeen
                          ? t('sessions.lastSeenValue', { value: lastSeen })
                          : t('sessions.noActivity')}
                      </span>
                      <span className="font-mono text-tertiary">
                        #{session.id}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <AccessEmptyState>{t('sessions.empty')}</AccessEmptyState>
            )}
          </div>
        </AccessCard>

        <div className="space-y-6">
          {selectedSession ? (
            <AccessCard>
              <AccessSectionHeader
                eyebrow={t('sessions.title')}
                title={getSessionTitle(
                  selectedSession,
                  t('sessions.unknownClient'),
                )}
                description={
                  selectedSession.userAgent || t('sessions.unknownClient')
                }
                actions={
                  <>
                    {selectedSession.id === mostRecentSessionId ? (
                      <AccessBadge tone="accent">
                        {t('sessions.mostRecent')}
                      </AccessBadge>
                    ) : null}
                    <AccessBadge tone="neutral">
                      {t('sessions.workspaceLabel', {
                        tenantId: selectedSession.tenantId,
                      })}
                    </AccessBadge>
                  </>
                }
              />

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-border-default bg-surface-1 p-4">
                  <p className="text-micro font-semibold uppercase tracking-[0.22em] text-tertiary">
                    {t('sessions.ipAddress')}
                  </p>
                  <p className="mt-2 text-body-l font-semibold text-primary">
                    {selectedSession.ipAddress || t('sessions.unknownIp')}
                  </p>
                </div>
                <div className="rounded-xl border border-border-default bg-surface-1 p-4">
                  <p className="text-micro font-semibold uppercase tracking-[0.22em] text-tertiary">
                    {t('sessions.expiresAt')}
                  </p>
                  <p className="mt-2 text-body-l font-semibold text-primary">
                    {formatTimestamp(selectedSession.expiresAt) ??
                      getEmptyDisplayValue()}
                  </p>
                </div>
                <div className="rounded-xl border border-border-default bg-surface-1 p-4">
                  <p className="text-micro font-semibold uppercase tracking-[0.22em] text-tertiary">
                    {t('sessions.lastSeen')}
                  </p>
                  <p className="mt-2 text-body-l font-semibold text-primary">
                    {formatTimestamp(selectedSession.lastSeenAt) ??
                      t('sessions.noActivity')}
                  </p>
                </div>
                <div className="rounded-xl border border-border-default bg-surface-1 p-4">
                  <p className="text-micro font-semibold uppercase tracking-[0.22em] text-tertiary">
                    {t('sessions.sessionId')}
                  </p>
                  <p className="mt-2 font-mono text-body-l font-semibold text-primary">
                    {selectedSession.id}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-border-default bg-surface-1 p-4">
                <p className="text-micro font-semibold uppercase tracking-[0.22em] text-tertiary">
                  {t('sessions.userAgent')}
                </p>
                <p className="mt-2 break-words font-mono text-body-s leading-6 text-secondary">
                  {selectedSession.userAgent || t('sessions.unknownClient')}
                </p>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className={dangerOutlineButtonClassName}
                  isLoading={revokeSession.isPending}
                  onClick={() => {
                    void revokeSession.mutateAsync(selectedSession.id);
                  }}
                >
                  {t('sessions.revoke')}
                </Button>
              </div>
            </AccessCard>
          ) : (
            <AccessEmptyState>{t('sessions.empty')}</AccessEmptyState>
          )}

          <AccessCard>
            <AccessSectionHeader
              eyebrow={t('sessions.securityTitle')}
              title={t('sessions.signOutEverywhere')}
              description={t('sessions.signOutEverywhereHint')}
            />
            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                className={dangerOutlineButtonClassName}
                isLoading={logoutAllSessions.isPending}
                onClick={() => {
                  void logoutAllSessions.mutateAsync();
                }}
              >
                <LogOut className="mr-2 size-4" />
                {t('sessions.signOutEverywhere')}
              </Button>
            </div>
          </AccessCard>
        </div>
      </div>
    </div>
  );
};
