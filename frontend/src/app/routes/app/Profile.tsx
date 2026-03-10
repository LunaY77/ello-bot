import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { ContentLayout } from '@/components/layouts';
import { paths } from '@/config/paths';
import { AvatarUpload, ResetPasswordForm, UserProfile } from '@/features/users';

const ProfileRoute: React.FC = () => {
  const { t } = useTranslation('user');
  const navigate = useNavigate();

  return (
    <ContentLayout
      title={t('profile.title')}
      description={t('profile.description')}
    >
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <UserProfile />
        <div className="space-y-6">
          <div className="overflow-hidden rounded-[2rem] border border-stone-200 bg-white/85 shadow-[0_35px_100px_-60px_rgba(50,31,16,0.35)]">
            <div className="px-6 py-6">
              <h3 className="text-xl font-semibold text-stone-950">
                {t('profile.avatar')}
              </h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                {t('profile.avatarHint')}
              </p>
            </div>
            <div className="border-t border-stone-200 px-6 py-6">
              <AvatarUpload />
            </div>
          </div>
          <div className="overflow-hidden rounded-[2rem] border border-stone-200 bg-white/85 shadow-[0_35px_100px_-60px_rgba(50,31,16,0.35)]">
            <div className="px-6 py-6">
              <h3 className="text-xl font-semibold text-stone-950">
                {t('resetPassword.title')}
              </h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">
                {t('resetPassword.description')}
              </p>
            </div>
            <div className="border-t border-stone-200 px-6 py-6">
              <ResetPasswordForm
                onSuccess={() => {
                  navigate(paths.auth.login.getHref(), { replace: true });
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </ContentLayout>
  );
};

export default ProfileRoute;
