import dayjs from 'dayjs';
import {
  ArrowUpRight,
  Building2,
  CalendarClock,
  ShieldCheck,
  UserRound,
  Users,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { CreateTenantRequestSchema } from '@/api/schemas';
import { ContentLayout } from '@/components/layouts';
import { Button } from '@/components/ui/button';
import { Form, Input } from '@/components/ui/form';
import { Link } from '@/components/ui/link';
import { Spinner } from '@/components/ui/spinner';
import { paths } from '@/config/paths';
import {
  useAuthSessions,
  useCreateTenant,
  useLogoutAllSessions,
  useRevokeSession,
  useSwitchTenant,
  useVisibleTenants,
  type SessionInfo,
} from '@/features/auth';
import {
  getViewerDisplayName,
  getViewerHandle,
  useCurrentUser,
} from '@/lib/auth';
import { cn } from '@/utils/cn';

const DashboardRoute = () => {
  const { t } = useTranslation('common');
  const { data: viewer, isLoading } = useCurrentUser();
  const tenants = useVisibleTenants();
  const sessions = useAuthSessions();
  const switchTenant = useSwitchTenant();
  const logoutAllSessions = useLogoutAllSessions();
  const revokeSession = useRevokeSession();
  const createTenant = useCreateTenant({
    mutationConfig: {
      onSuccess: async (tenant) => {
        await switchTenant.mutateAsync({ tenantId: tenant.id });
      },
    },
  });

  if (isLoading || !viewer) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner size="xl" />
      </div>
    );
  }

  return (
    <ContentLayout
      title={t('dashboard.title')}
      description={t('dashboard.description')}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <InfoCard
          icon={<UserRound className="size-5" />}
          eyebrow={t('dashboard.identity')}
          title={getViewerDisplayName(viewer)}
          description={t('dashboard.identityDescription', {
            handle: getViewerHandle(viewer),
          })}
          meta={viewer.principal.principalType}
        />
        <InfoCard
          icon={<Building2 className="size-5" />}
          eyebrow={t('dashboard.workspace')}
          title={viewer.tenant.name}
          description={t('dashboard.workspaceDescription', {
            slug: viewer.tenant.slug,
          })}
          meta={viewer.tenant.isActive ? t('dashboard.active') : t('dashboard.inactive')}
        />
        <InfoCard
          icon={<ShieldCheck className="size-5" />}
          eyebrow={t('dashboard.security')}
          title={t('dashboard.sessionCount', {
            count: sessions.data?.length ?? 0,
          })}
          description={t('dashboard.securityDescription')}
          meta={viewer.principal.isActive ? t('dashboard.active') : t('dashboard.inactive')}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <section className="rounded-[2rem] border border-stone-200 bg-white/85 p-6 shadow-[0_35px_100px_-60px_rgba(50,31,16,0.35)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-500">
                  {t('dashboard.availableWorkspaces')}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-stone-950">
                  {t('dashboard.switchWorkspace')}
                </h2>
                <p className="mt-2 text-sm leading-6 text-stone-600">
                  {t('dashboard.switchWorkspaceHint')}
                </p>
              </div>
              <Button
                asChild
                variant="outline"
                className="rounded-2xl border-stone-300 bg-white/80"
              >
                <Link to={paths.app.users.getHref()}>
                  {t('dashboard.manageMembers')}
                </Link>
              </Button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {tenants.data?.map((tenant) => {
                const isCurrent = tenant.id === viewer.tenant.id;
                return (
                  <button
                    key={tenant.id}
                    type="button"
                    className={cn(
                      'rounded-[1.5rem] border px-4 py-4 text-left transition',
                      isCurrent
                        ? 'border-stone-900 bg-stone-900 text-white'
                        : 'border-stone-200 bg-stone-50 hover:border-stone-300 hover:bg-white',
                    )}
                    onClick={() => {
                      if (!isCurrent) {
                        switchTenant.mutate({ tenantId: tenant.id });
                      }
                    }}
                    disabled={switchTenant.isPending}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold">{tenant.name}</p>
                        <p
                          className={cn(
                            'mt-1 text-xs uppercase tracking-[0.22em]',
                            isCurrent ? 'text-stone-300' : 'text-stone-500',
                          )}
                        >
                          {tenant.slug}
                        </p>
                      </div>
                      <ArrowUpRight className="size-4 shrink-0" />
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 rounded-[1.5rem] border border-dashed border-stone-300 bg-stone-50/70 p-5">
              <p className="text-sm font-semibold text-stone-900">
                {t('dashboard.createWorkspace')}
              </p>
              <p className="mt-1 text-sm text-stone-600">
                {t('dashboard.createWorkspaceHint')}
              </p>
              <div className="mt-5">
                <Form
                  schema={CreateTenantRequestSchema}
                  onSubmit={(values) => {
                    createTenant.mutate(values);
                  }}
                >
                  {({ register, formState }) => (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Input
                        type="text"
                        label={t('dashboard.workspaceName')}
                        error={formState.errors.name}
                        registration={register('name')}
                        placeholder={t('dashboard.workspaceNamePlaceholder')}
                        className="h-11 rounded-2xl border-stone-300 bg-white"
                      />
                      <Input
                        type="text"
                        label={t('dashboard.workspaceSlug')}
                        error={formState.errors.slug}
                        registration={register('slug')}
                        placeholder={t('dashboard.workspaceSlugPlaceholder')}
                        className="h-11 rounded-2xl border-stone-300 bg-white"
                      />
                      <div className="sm:col-span-2">
                        <Button
                          type="submit"
                          className="h-11 rounded-2xl"
                          isLoading={createTenant.isPending || switchTenant.isPending}
                        >
                          {t('dashboard.createWorkspace')}
                        </Button>
                      </div>
                    </div>
                  )}
                </Form>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-stone-200 bg-white/85 p-6 shadow-[0_35px_100px_-60px_rgba(50,31,16,0.35)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-500">
                  {t('dashboard.quickActions')}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-stone-950">
                  {t('dashboard.quickActionsTitle')}
                </h2>
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <ActionTile
                to={paths.app.profile.getHref()}
                icon={<UserRound className="size-5" />}
                title={t('dashboard.manageProfile')}
                description={t('dashboard.manageProfileHint')}
              />
              <ActionTile
                to={paths.app.users.getHref()}
                icon={<Users className="size-5" />}
                title={t('dashboard.manageMembers')}
                description={t('dashboard.manageMembersHint')}
              />
              <ActionTile
                to={paths.app.iam.getHref()}
                icon={<ShieldCheck className="size-5" />}
                title={t('dashboard.manageAccess')}
                description={t('dashboard.manageAccessHint')}
              />
            </div>
          </section>
        </div>

        <section className="rounded-[2rem] border border-stone-200 bg-white/85 p-6 shadow-[0_35px_100px_-60px_rgba(50,31,16,0.35)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-500">
                {t('dashboard.sessions')}
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-stone-950">
                {t('dashboard.securitySessions')}
              </h2>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                {t('dashboard.securitySessionsHint')}
              </p>
            </div>
            <Button
              variant="outline"
              className="rounded-2xl border-stone-300 bg-white/80"
              onClick={() => logoutAllSessions.mutate(undefined)}
              isLoading={logoutAllSessions.isPending}
            >
              {t('dashboard.logoutAll')}
            </Button>
          </div>

          <div className="mt-6 space-y-3">
            {sessions.isLoading ? (
              <div className="flex justify-center py-10">
                <Spinner />
              </div>
            ) : sessions.data && sessions.data.length > 0 ? (
              sessions.data.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  revokeLabel={t('dashboard.revokeSession')}
                  expiresLabel={t('dashboard.expires')}
                  lastSeenLabel={t('dashboard.lastSeen')}
                  noActivityLabel={t('dashboard.noActivity')}
                  unknownClientLabel={t('dashboard.unknownClient')}
                  unknownIpLabel={t('dashboard.unknownIp')}
                  onRevoke={() => revokeSession.mutate(session.id)}
                  isRevoking={revokeSession.isPending}
                />
              ))
            ) : (
              <div className="rounded-[1.5rem] border border-dashed border-stone-300 bg-stone-50/80 px-4 py-8 text-center text-sm text-stone-600">
                {t('dashboard.emptySessions')}
              </div>
            )}
          </div>
        </section>
      </div>
    </ContentLayout>
  );
};

type InfoCardProps = {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  meta: string;
};

const InfoCard = ({ icon, eyebrow, title, description, meta }: InfoCardProps) => (
  <section className="rounded-[2rem] border border-stone-200 bg-white/85 p-6 shadow-[0_35px_100px_-60px_rgba(50,31,16,0.35)]">
    <div className="flex items-center gap-3 text-primary">
      <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10">
        {icon}
      </div>
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-500">
        {eyebrow}
      </p>
    </div>
    <h2 className="mt-5 text-2xl font-semibold text-stone-950">{title}</h2>
    <p className="mt-3 text-sm leading-6 text-stone-600">{description}</p>
    <p className="mt-5 text-xs font-semibold uppercase tracking-[0.24em] text-stone-500">
      {meta}
    </p>
  </section>
);

type ActionTileProps = {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
};

const ActionTile = ({ to, icon, title, description }: ActionTileProps) => (
  <Link
    to={to}
    className="rounded-[1.5rem] border border-stone-200 bg-stone-50 px-5 py-5 transition hover:border-stone-300 hover:bg-white"
  >
    <div className="flex items-center gap-3 text-primary">
      {icon}
      <span className="text-base font-semibold text-stone-900">{title}</span>
    </div>
    <p className="mt-3 text-sm leading-6 text-stone-600">{description}</p>
  </Link>
);

type SessionRowProps = {
  session: SessionInfo;
  revokeLabel: string;
  expiresLabel: string;
  lastSeenLabel: string;
  noActivityLabel: string;
  unknownClientLabel: string;
  unknownIpLabel: string;
  onRevoke: () => void;
  isRevoking: boolean;
};

const SessionRow = ({
  session,
  revokeLabel,
  expiresLabel,
  lastSeenLabel,
  noActivityLabel,
  unknownClientLabel,
  unknownIpLabel,
  onRevoke,
  isRevoking,
}: SessionRowProps) => (
  <div className="rounded-[1.5rem] border border-stone-200 bg-stone-50/80 p-4">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm font-semibold text-stone-900">
          <CalendarClock className="size-4 shrink-0 text-primary" />
          <span className="truncate">{session.userAgent || unknownClientLabel}</span>
        </div>
        <p className="mt-2 text-sm text-stone-600">
          {session.ipAddress || unknownIpLabel}
        </p>
      </div>
      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
        #{session.id}
      </span>
    </div>

    <div className="mt-4 grid gap-2 text-sm text-stone-600">
      <p>
        {expiresLabel}: {dayjs(session.expiresAt).format('YYYY-MM-DD HH:mm')}
      </p>
      <p>
        {lastSeenLabel}:{' '}
        {session.lastSeenAt
          ? dayjs(session.lastSeenAt).format('YYYY-MM-DD HH:mm')
          : noActivityLabel}
      </p>
    </div>

    <div className="mt-4">
      <Button
        type="button"
        variant="outline"
        className="rounded-2xl border-stone-300 bg-white/85"
        onClick={onRevoke}
        isLoading={isRevoking}
      >
        {revokeLabel}
      </Button>
    </div>
  </div>
);

export default DashboardRoute;
