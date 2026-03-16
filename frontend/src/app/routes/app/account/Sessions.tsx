import { useTranslation } from 'react-i18next';

import { ContentLayout } from '@/components/layouts';
import { SessionsPanel } from '@/features/sessions';

const SessionsRoute = () => {
  const { t } = useTranslation('common');

  return (
    <ContentLayout
      title={t('sessions.title')}
      description={t('sessions.description')}
    >
      <SessionsPanel />
    </ContentLayout>
  );
};

export default SessionsRoute;
