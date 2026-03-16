import { useTranslation } from 'react-i18next';

import { ContentLayout } from '@/components/layouts';
import { AccountOverview } from '@/features/user';

const OverviewRoute = () => {
  const { t } = useTranslation('common');

  return (
    <ContentLayout
      title={t('overview.title')}
      description={t('overview.description')}
    >
      <AccountOverview />
    </ContentLayout>
  );
};

export default OverviewRoute;
