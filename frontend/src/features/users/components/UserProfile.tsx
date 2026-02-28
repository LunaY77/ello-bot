import { useTranslation } from 'react-i18next';

import { Spinner } from '@/components/ui/spinner';
import { useCurrentUser } from '@/lib/auth';

export const UserProfile: React.FC = () => {
  const { t } = useTranslation('user');
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner size="xl" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="overflow-hidden bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900">
          {t('profile.userInfo')}
        </h3>
      </div>
      <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
        <dl className="sm:divide-y sm:divide-gray-200">
          <Entry label={t('profile.username')} value={user.username} />
          <Entry
            label={t('profile.role')}
            value={user.role ?? t('profile.roleUser')}
          />
          <Entry
            label={t('profile.status')}
            value={user.isActive ? t('profile.active') : t('profile.inactive')}
          />
        </dl>
      </div>
    </div>
  );
};

type EntryProps = {
  label: string;
  value: string;
};

const Entry: React.FC<EntryProps> = ({ label, value }) => (
  <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 sm:py-5">
    <dt className="text-sm font-medium text-gray-500">{label}</dt>
    <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
      {value}
    </dd>
  </div>
);
