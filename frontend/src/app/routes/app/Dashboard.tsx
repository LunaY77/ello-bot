import { useTranslation } from 'react-i18next';

import { ContentLayout } from '@/components/layouts';
import { useCurrentUser } from '@/lib/auth';

const DashboardRoute = () => {
  const { t } = useTranslation('common');
  const { data: user } = useCurrentUser();

  return (
    <ContentLayout title={t('dashboard.title')}>
      <h1 className="text-xl">
        {t('dashboard.welcome', { name: user?.username })}
      </h1>
      <h4 className="my-3">
        {t('dashboard.role', {
          role:
            user?.role === 'ADMIN' ? t('dashboard.admin') : t('dashboard.user'),
        })}
      </h4>
      <p className="font-medium">{t('dashboard.capabilities')}</p>
      <ul className="my-4 list-inside list-disc">
        <li>{t('dashboard.manageProfile')}</li>
        <li>{t('dashboard.resetPassword')}</li>
        <li>{t('dashboard.updateAvatar')}</li>
      </ul>
    </ContentLayout>
  );
};

export default DashboardRoute;
