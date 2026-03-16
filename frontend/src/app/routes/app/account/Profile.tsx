import { useTranslation } from 'react-i18next';

import { ContentLayout } from '@/components/layouts';
import { ProfileDetailsCard, ProfileForm } from '@/features/user';

const ProfileRoute = () => {
  const { t } = useTranslation('user');

  return (
    <ContentLayout
      title={t('profile.title')}
      description={t('profile.description')}
    >
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <ProfileDetailsCard />
        <ProfileForm />
      </div>
    </ContentLayout>
  );
};

export default ProfileRoute;
