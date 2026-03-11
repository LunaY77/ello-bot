import { useTranslation } from 'react-i18next';

import { ContentLayout } from '@/components/layouts';
import { WorkspacesConsole } from '@/features/iam';

const WorkspacesRoute = () => {
  const { t } = useTranslation('iam');

  return (
    <ContentLayout
      title={t('workspace.title')}
      description={t('workspace.description')}
    >
      <WorkspacesConsole />
    </ContentLayout>
  );
};

export default WorkspacesRoute;
