import { useTranslation } from 'react-i18next';

import { ContentLayout } from '@/components/layouts';
import { PermissionsConsole } from '@/features/iam';

const PermissionsRoute = () => {
  const { t } = useTranslation('iam');

  return (
    <ContentLayout
      title={t('permissions.title')}
      description={t('permissions.description')}
    >
      <PermissionsConsole />
    </ContentLayout>
  );
};

export default PermissionsRoute;
