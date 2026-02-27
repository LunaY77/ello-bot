import { useTranslation } from 'react-i18next';

import { Link } from '@/components/ui/link';
import { paths } from '@/config/paths';

const NotFoundRoute = () => {
  const { t } = useTranslation('common');

  return (
    <div className="mt-52 flex flex-col items-center font-semibold">
      <h1 className="text-4xl text-gray-900">404</h1>
      <p className="mt-2 text-gray-500">{t('notFound.message')}</p>
      <Link to={paths.home.getHref()} replace className="mt-4">
        {t('notFound.backHome')}
      </Link>
    </div>
  );
};

export default NotFoundRoute;
