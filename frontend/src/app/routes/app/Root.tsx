import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router';

import { AppShellLayout } from '@/components/layouts';

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

const AppRoot = () => {
  return (
    <AppShellLayout>
      <Outlet />
    </AppShellLayout>
  );
};

export default AppRoot;
