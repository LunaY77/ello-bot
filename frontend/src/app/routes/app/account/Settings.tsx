import { useTranslation } from 'react-i18next';

import { ContentLayout } from '@/components/layouts';
import { SettingsForm } from '@/features/user';

const SettingsRoute = () => {
  const { t } = useTranslation('user');

  return (
    <ContentLayout
      title={t('settings.title')}
      description={t('settings.description')}
    >
      <SettingsForm />
    </ContentLayout>
  );
};

export default SettingsRoute;
