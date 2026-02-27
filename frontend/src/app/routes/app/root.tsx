import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router';

import { DashboardLayout } from '@/components/layouts';

/** Error boundary for app routes */
export const ErrorBoundary = () => {
  const { t } = useTranslation('error');

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-red-500">
          {t('boundary.title')}
        </h1>
        <p className="mt-2 text-gray-500">{t('boundary.message')}</p>
      </div>
    </div>
  );
};

/** App root component, wraps child routes with DashboardLayout */
const AppRoot = () => {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
};

export default AppRoot;
