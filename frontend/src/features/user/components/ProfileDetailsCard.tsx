import { useTranslation } from 'react-i18next';

import { Spinner } from '@/components/ui/spinner';
import {
  getViewerAvatarUrl,
  getViewerDisplayName,
  useCurrentUser,
} from '@/lib/auth';

export const ProfileDetailsCard = () => {
  const { t } = useTranslation('user');
  const viewer = useCurrentUser().data;

  if (!viewer) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-xl border border-border-default bg-surface-2 p-6 shadow-1">
        <Spinner size="lg" />
      </div>
    );
  }

  const avatarUrl = getViewerAvatarUrl(viewer);
  const displayName = getViewerDisplayName(viewer);

  return (
    <div className="rounded-xl border border-border-default bg-surface-2 p-6 shadow-1">
      <div className="flex items-center gap-4">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="size-16 rounded-xl object-cover"
          />
        ) : (
          <div className="flex size-16 items-center justify-center rounded-xl bg-surface-3 text-xl font-semibold text-primary">
            {displayName.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <h3 className="text-xl font-semibold text-primary">{displayName}</h3>
          <p className="mt-1 text-sm text-secondary">@{viewer.user.username}</p>
        </div>
      </div>
      <dl className="mt-6 space-y-3 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-secondary">{t('profile.username')}</dt>
          <dd className="font-medium text-primary">{viewer.user.username}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-secondary">{t('profile.timezone')}</dt>
          <dd className="font-medium text-primary">
            {viewer.user.timezone || t('profile.emptyValue')}
          </dd>
        </div>
      </dl>
    </div>
  );
};
