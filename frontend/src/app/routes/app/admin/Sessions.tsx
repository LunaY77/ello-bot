import { useTranslation } from 'react-i18next';

import { ContentLayout } from '@/components/layouts';
import { SessionsConsole } from '@/features/iam';

const SessionsRoute = () => {
  const { t } = useTranslation('common');

  return (
    <ContentLayout
      title={t('sessions.title')}
      description={t('sessions.description')}
    >
      <SessionsConsole />
    </ContentLayout>
  );
};

export default SessionsRoute;
