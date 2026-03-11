import { useTranslation } from 'react-i18next';

import { ContentLayout } from '@/components/layouts';
import { Spinner } from '@/components/ui/spinner';
import { useUsers } from '@/features/users';
import { useCurrentUser } from '@/lib/auth';

const UsersRoute = () => {
  const { t } = useTranslation('user');
  const { data: viewer } = useCurrentUser();
  const users = useUsers({
    tenantId: viewer?.tenant.id,
    queryConfig: {
      enabled: Boolean(viewer?.tenant.id),
    },
  });

  return (
    <ContentLayout
      title={t('users.title')}
      description={t('users.description', {
        tenant: viewer?.tenant.name ?? 'Ello',
      })}
    >
      {users.isLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner size="xl" />
        </div>
      ) : users.data && users.data.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {users.data.map((user) => (
            <article
              key={user.principalId}
              className="rounded-[2rem] border border-stone-200 bg-white/85 p-6 shadow-[0_35px_100px_-60px_rgba(50,31,16,0.35)]"
            >
              <div className="flex items-start gap-4">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName}
                    className="size-14 rounded-[1.2rem] object-cover"
                  />
                ) : (
                  <div className="flex size-14 items-center justify-center rounded-[1.2rem] bg-stone-200 text-lg font-semibold text-stone-900">
                    {user.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-semibold text-stone-950">
                    {user.displayName}
                  </h2>
                  <p className="truncate text-sm text-stone-600">
                    @{user.username}
                  </p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
                    {user.isActive
                      ? t('profile.active')
                      : t('profile.inactive')}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-2 text-sm text-stone-600">
                <p>
                  {t('users.timezone')}:{' '}
                  {user.timezone || t('users.emptyValue')}
                </p>
                <p>
                  {t('users.gender')}: {user.gender || t('users.emptyValue')}
                </p>
                <p className="line-clamp-3">
                  {user.bio || t('users.emptyBio')}
                </p>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-[2rem] border border-dashed border-stone-300 bg-stone-50/80 px-6 py-14 text-center">
          <h2 className="text-xl font-semibold text-stone-900">
            {t('users.emptyTitle')}
          </h2>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            {t('users.emptyDescription')}
          </p>
        </div>
      )}
    </ContentLayout>
  );
};

export default UsersRoute;
