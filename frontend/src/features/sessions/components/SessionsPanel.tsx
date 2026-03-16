import { MonitorSmartphone, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useLogoutAllSessions, useSessions } from '../api/sessions';

import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { formatDate, formatRelativeDate } from '@/utils/format';

const SessionMetric = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) => {
  return (
    <div className="rounded-xl border border-border-default bg-surface-2 p-5 shadow-1">
      <p className="text-micro font-semibold uppercase tracking-[0.24em] text-tertiary">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold text-primary">{value}</p>
      <p className="mt-2 text-sm text-secondary">{hint}</p>
    </div>
  );
};

export const SessionsPanel = () => {
  const { t } = useTranslation('common');
  const sessionsQuery = useSessions();
  const logoutAll = useLogoutAllSessions();

  if (sessionsQuery.isLoading) {
    return (
      <div className="flex min-h-[280px] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const sessions = sessionsQuery.data ?? [];
  const nextExpiry = sessions.map((session) => session.expiresAt).sort()[0];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 lg:grid-cols-3">
        <SessionMetric
          label={t('sessions.total')}
          value={String(sessions.length)}
          hint={t('sessions.activeHint')}
        />
        <SessionMetric
          label={t('sessions.nextExpiry')}
          value={nextExpiry ? formatDate(nextExpiry) : t('emptyValue')}
          hint={t('sessions.clientsHint')}
        />
        <div className="rounded-xl border border-border-default bg-surface-2 p-5 shadow-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-micro font-semibold uppercase tracking-[0.24em] text-tertiary">
                {t('sessions.signOutEverywhere')}
              </p>
              <p className="mt-3 text-sm leading-6 text-secondary">
                {t('sessions.signOutEverywhereHint')}
              </p>
            </div>
            <div className="flex size-11 items-center justify-center rounded-full bg-danger/10 text-danger">
              <ShieldCheck className="size-5" />
            </div>
          </div>
          <Button
            className="mt-5 h-11 rounded-md"
            variant="destructive"
            isLoading={logoutAll.isPending}
            onClick={() => logoutAll.mutate(undefined)}
          >
            {t('sessions.logoutAll')}
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-primary">
            {t('sessions.directoryTitle')}
          </h2>
          <p className="mt-2 text-sm leading-6 text-secondary">
            {t('sessions.directoryDescription')}
          </p>
        </div>
        {sessions.length ? (
          sessions.map((session) => (
            <article
              key={session.id}
              className="rounded-xl border border-border-default bg-surface-2 p-5 shadow-1"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-accent-soft-bg text-accent-soft-text">
                      <MonitorSmartphone className="size-4" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-semibold text-primary">
                        {session.userAgent || t('sessions.unknownClient')}
                      </h3>
                      <p className="truncate text-sm text-secondary">
                        {session.ipAddress || t('sessions.unknownIp')}
                      </p>
                    </div>
                  </div>
                  <dl className="mt-5 grid gap-3 text-sm md:grid-cols-2">
                    <div>
                      <dt className="text-secondary">
                        {t('sessions.sessionId')}
                      </dt>
                      <dd className="mt-1 font-medium text-primary">
                        {session.id}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-secondary">
                        {t('sessions.expiresAt')}
                      </dt>
                      <dd className="mt-1 font-medium text-primary">
                        {formatDate(session.expiresAt)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-secondary">
                        {t('sessions.lastSeen')}
                      </dt>
                      <dd className="mt-1 font-medium text-primary">
                        {session.lastSeenAt
                          ? formatRelativeDate(session.lastSeenAt)
                          : t('sessions.noActivity')}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-secondary">{t('created')}</dt>
                      <dd className="mt-1 font-medium text-primary">
                        {formatDate(session.createdAt)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-border-default bg-surface-2 p-8 text-center text-sm text-secondary">
            {t('sessions.empty')}
          </div>
        )}
      </section>
    </div>
  );
};
