import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { Head } from '@/components/seo';
import { Button } from '@/components/ui/button';
import { paths } from '@/config/paths';
import { useCurrentUser } from '@/lib/auth';

const LandingRoute = () => {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();

  const handleStart = () => {
    if (user) {
      navigate(paths.app.dashboard.getHref());
    } else {
      navigate(paths.auth.login.getHref());
    }
  };

  return (
    <>
      <Head description={t('landing.subtitle')} />
      <div className="flex h-screen items-center bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 text-center sm:px-6 lg:px-8 lg:py-16">
          <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            <span className="block">Ello</span>
          </h2>
          <p className="mt-4 text-xl text-gray-500">{t('landing.subtitle')}</p>
          <div className="mt-8 flex justify-center">
            <div className="inline-flex rounded-md shadow">
              <Button onClick={handleStart}>{t('landing.register')}</Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LandingRoute;
