import { Activity, ShieldCheck, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  useCurrentUser,
  getViewerDisplayName,
  getViewerHandle,
} from '@/lib/auth';
import { formatDate } from '@/utils/format';

const OverviewCard = ({
  eyebrow,
  title,
  description,
  value,
}: {
  eyebrow: string;
  title: string;
  description: string;
  value: string;
}) => {
  return (
    <div className="rounded-xl border border-border-default bg-surface-2 p-5 shadow-1">
      <p className="text-micro font-semibold uppercase tracking-[0.24em] text-tertiary">
        {eyebrow}
      </p>
      <h3 className="mt-3 text-lg font-semibold text-primary">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-secondary">{description}</p>
      <p className="mt-4 text-sm font-medium text-primary">{value}</p>
    </div>
  );
};

export const AccountOverview = () => {
  const { t } = useTranslation('common');
  const { t: userT } = useTranslation('user');
  const viewer = useCurrentUser().data;

  if (!viewer) {
    return null;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border-default bg-surface-2 p-6 shadow-1">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface-3 px-3 py-1 text-micro font-semibold uppercase tracking-[0.24em] text-tertiary">
              <Sparkles className="size-3.5" />
              {userT('overview.eyebrow')}
            </p>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-primary">
              {getViewerDisplayName(viewer)}
            </h2>
            <p className="mt-2 text-sm text-secondary">
              @{getViewerHandle(viewer)}
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-secondary">
              {viewer.user.bio || userT('overview.emptyBio')}
            </p>
          </div>
          <div className="rounded-xl border border-border-subtle bg-surface-1 px-4 py-3 text-sm text-secondary">
            <p>{userT('overview.locale', { value: viewer.settings.locale })}</p>
            <p className="mt-1">
              {userT('overview.theme', { value: viewer.settings.theme })}
            </p>
            <p className="mt-1">
              {userT('overview.updatedAt', {
                value: formatDate(viewer.user.updatedAt),
              })}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <OverviewCard
          eyebrow={userT('overview.cards.profileEyebrow')}
          title={userT('overview.cards.profileTitle')}
          description={userT('overview.cards.profileDescription')}
          value={viewer.user.timezone || t('emptyValue')}
        />
        <OverviewCard
          eyebrow={userT('overview.cards.settingsEyebrow')}
          title={userT('overview.cards.settingsTitle')}
          description={userT('overview.cards.settingsDescription')}
          value={viewer.settings.defaultModel}
        />
        <OverviewCard
          eyebrow={userT('overview.cards.securityEyebrow')}
          title={userT('overview.cards.securityTitle')}
          description={userT('overview.cards.securityDescription')}
          value={
            viewer.user.isActive
              ? userT('profile.active')
              : userT('profile.inactive')
          }
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border-default bg-surface-2 p-5 shadow-1">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-accent-soft-bg text-accent-soft-text">
              <Activity className="size-4" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-primary">
                {userT('overview.activityTitle')}
              </h3>
              <p className="text-sm text-secondary">
                {userT('overview.activityDescription')}
              </p>
            </div>
          </div>
          <p className="mt-5 text-sm leading-6 text-secondary">
            {viewer.settings.systemPrompt || userT('overview.emptyPrompt')}
          </p>
        </div>
        <div className="rounded-xl border border-border-default bg-surface-2 p-5 shadow-1">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-success-soft-bg text-success">
              <ShieldCheck className="size-4" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-primary">
                {userT('overview.securityTitle')}
              </h3>
              <p className="text-sm text-secondary">
                {userT('overview.securityDescription')}
              </p>
            </div>
          </div>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-secondary">{userT('profile.username')}</dt>
              <dd className="font-medium text-primary">
                {viewer.user.username}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-secondary">{userT('profile.timezone')}</dt>
              <dd className="font-medium text-primary">
                {viewer.user.timezone || t('emptyValue')}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-secondary">
                {userT('overview.defaultModel')}
              </dt>
              <dd className="font-medium text-primary">
                {viewer.settings.defaultModel}
              </dd>
            </div>
          </dl>
        </div>
      </section>
    </div>
  );
};
