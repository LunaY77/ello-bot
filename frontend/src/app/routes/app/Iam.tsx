import { useTranslation } from 'react-i18next';

import { ContentLayout } from '@/components/layouts';
import { IamConsole } from '@/features/iam/components/IamConsole';

const IamRoute = () => {
  const { t } = useTranslation('iam');

  return (
    <ContentLayout title={t('page.title')} description={t('page.description')}>
      <IamConsole />
    </ContentLayout>
  );
};

export default IamRoute;
