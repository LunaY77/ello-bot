import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';

export const MainErrorFallback = () => {
  const { t } = useTranslation('error');

  return (
    <div
      className="flex h-screen w-screen flex-col items-center justify-center text-red-500"
      role="alert"
    >
      <h2 className="text-lg font-semibold">{t('fallback.title')}</h2>
      <p className="mt-2 text-sm text-gray-500">{t('fallback.message')}</p>
      <Button
        className="mt-4"
        onClick={() => window.location.assign(window.location.origin)}
      >
        {t('fallback.refresh')}
      </Button>
    </div>
  );
};
