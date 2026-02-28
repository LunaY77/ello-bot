import { useTranslation } from 'react-i18next';

import { ContentLayout } from '@/components/layouts';
import { AvatarUpload, ResetPasswordForm, UserProfile } from '@/features/users';

const ProfileRoute: React.FC = () => {
  const { t } = useTranslation('user');

  return (
    <ContentLayout title={t('profile.title')}>
      <div className="space-y-8">
        <UserProfile />
        <div className="overflow-hidden bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              {t('profile.changeAvatar')}
            </h3>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <AvatarUpload />
          </div>
        </div>
        <div className="overflow-hidden bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              {t('resetPassword.title')}
            </h3>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <ResetPasswordForm />
          </div>
        </div>
      </div>
    </ContentLayout>
  );
};

export default ProfileRoute;
