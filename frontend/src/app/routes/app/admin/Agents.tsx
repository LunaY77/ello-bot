import { useTranslation } from 'react-i18next';

import { ContentLayout } from '@/components/layouts';
import { AgentsConsole } from '@/features/iam';

const AgentsRoute = () => {
  const { t } = useTranslation('iam');

  return (
    <ContentLayout
      title={t('agents.title')}
      description={t('agents.description')}
    >
      <AgentsConsole />
    </ContentLayout>
  );
};

export default AgentsRoute;
