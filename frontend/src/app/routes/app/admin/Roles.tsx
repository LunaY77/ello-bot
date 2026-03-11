import { useTranslation } from 'react-i18next';

import { ContentLayout } from '@/components/layouts';
import { RolesConsole } from '@/features/iam';

const RolesRoute = () => {
  const { t } = useTranslation('iam');

  return (
    <ContentLayout
      title={t('roles.title')}
      description={t('roles.description')}
    >
      <RolesConsole />
    </ContentLayout>
  );
};

export default RolesRoute;
