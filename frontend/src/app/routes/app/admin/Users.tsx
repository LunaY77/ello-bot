import { useTranslation } from 'react-i18next';

import { ContentLayout } from '@/components/layouts';
import { UsersConsole } from '@/features/iam';
import { useCurrentUser } from '@/lib/auth';

const UsersRoute = () => {
  const { t } = useTranslation('user');
  const { t: commonT } = useTranslation('common');
  const { data: viewer } = useCurrentUser();

  return (
    <ContentLayout
      title={t('users.title')}
      description={t('users.description', {
        tenant: viewer?.tenant.name ?? commonT('shell.product'),
      })}
    >
      <UsersConsole />
    </ContentLayout>
  );
};

export default UsersRoute;
