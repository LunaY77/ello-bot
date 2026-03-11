import { Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { useUpdateProfile } from '../api/update-profile';

import {
  updateUserProfileRequestSchemaBioMax,
  updateUserProfileRequestSchemaDisplayNameMax,
  updateUserProfileRequestSchemaGenderMax,
  updateUserProfileRequestSchemaTimezoneMax,
} from '@/api/schemas';
import { Button } from '@/components/ui/button';
import { FieldWrapper, Form, Input } from '@/components/ui/form';
import { Spinner } from '@/components/ui/spinner';
import { getViewerDisplayName, useCurrentUser } from '@/lib/auth';

const profileFormSchema = z.object({
  displayName: z
    .string()
    .max(updateUserProfileRequestSchemaDisplayNameMax)
    .optional(),
  bio: z.string().max(updateUserProfileRequestSchemaBioMax).optional(),
  gender: z.string().max(updateUserProfileRequestSchemaGenderMax).optional(),
  dateOfBirth: z.union([z.literal(''), z.string().date()]).optional(),
  timezone: z
    .string()
    .max(updateUserProfileRequestSchemaTimezoneMax)
    .optional(),
});

const nullable = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export const UserProfile: React.FC = () => {
  const { t } = useTranslation('user');
  const { data: viewer, isLoading } = useCurrentUser();
  const updateProfile = useUpdateProfile();

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner size="xl" />
      </div>
    );
  }

  if (!viewer) return null;
  if (!viewer.user) {
    return (
      <div className="rounded-[2rem] border border-stone-200 bg-white/85 p-6 shadow-[0_35px_100px_-60px_rgba(50,31,16,0.35)]">
        <h3 className="text-xl font-semibold text-stone-950">
          {t('profile.userInfo')}
        </h3>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          {t('profile.agentEditingUnavailable')}
        </p>
      </div>
    );
  }

  const user = viewer.user;

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="rounded-[2rem] border border-stone-200 bg-white/85 p-6 shadow-[0_35px_100px_-60px_rgba(50,31,16,0.35)]">
        <div className="flex items-start gap-4">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.displayName}
              className="size-20 rounded-[1.6rem] object-cover"
            />
          ) : (
            <div className="flex size-20 items-center justify-center rounded-[1.6rem] bg-stone-200 text-2xl font-semibold text-stone-900">
              {getViewerDisplayName(viewer).charAt(0).toUpperCase()}
            </div>
          )}

          <div className="min-w-0">
            <h3 className="truncate text-2xl font-semibold text-stone-950">
              {getViewerDisplayName(viewer)}
            </h3>
            <p className="truncate text-sm text-stone-600">@{user.username}</p>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
              {viewer.principal.principalType}
            </p>
          </div>
        </div>

        <dl className="mt-8 space-y-4">
          <Entry label={t('profile.workspace')} value={viewer.tenant.name} />
          <Entry
            label={t('profile.status')}
            value={
              viewer.principal.isActive
                ? t('profile.active')
                : t('profile.inactive')
            }
          />
          <Entry label={t('profile.username')} value={user.username} />
          <Entry
            label={t('profile.timezone')}
            value={user.timezone || t('profile.emptyValue')}
          />
          <Entry
            label={t('profile.birthDate')}
            value={user.dateOfBirth || t('profile.emptyValue')}
          />
        </dl>
      </div>

      <div className="rounded-[2rem] border border-stone-200 bg-white/85 p-6 shadow-[0_35px_100px_-60px_rgba(50,31,16,0.35)]">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-stone-500">
            {t('profile.editEyebrow')}
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-stone-950">
            {t('profile.editTitle')}
          </h3>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            {t('profile.editDescription')}
          </p>
        </div>

        <div className="mt-6">
          <Form
            key={`${user.principalId}-${user.updatedAt}`}
            schema={profileFormSchema}
            options={{
              defaultValues: {
                displayName: viewer.principal.displayName ?? '',
                bio: user.bio ?? '',
                gender: user.gender ?? '',
                dateOfBirth: user.dateOfBirth ?? '',
                timezone: user.timezone ?? '',
              },
            }}
            onSubmit={(values) => {
              updateProfile.mutate({
                displayName: nullable(values.displayName),
                bio: nullable(values.bio),
                gender: nullable(values.gender),
                dateOfBirth: values.dateOfBirth || null,
                timezone: nullable(values.timezone),
              });
            }}
          >
            {({ register, formState }) => (
              <div className="space-y-5">
                <Input
                  type="text"
                  label={t('profile.displayName')}
                  error={formState.errors.displayName}
                  registration={register('displayName')}
                  className="h-11 rounded-2xl border-stone-300 bg-white"
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    type="text"
                    label={t('profile.gender')}
                    error={formState.errors.gender}
                    registration={register('gender')}
                    className="h-11 rounded-2xl border-stone-300 bg-white"
                  />
                  <Input
                    type="text"
                    label={t('profile.timezone')}
                    error={formState.errors.timezone}
                    registration={register('timezone')}
                    className="h-11 rounded-2xl border-stone-300 bg-white"
                  />
                </div>
                <Input
                  type="date"
                  label={t('profile.birthDate')}
                  error={formState.errors.dateOfBirth}
                  registration={register('dateOfBirth')}
                  className="h-11 rounded-2xl border-stone-300 bg-white"
                />
                <FieldWrapper
                  label={t('profile.bio')}
                  error={formState.errors.bio}
                >
                  <textarea
                    {...register('bio')}
                    rows={5}
                    className="mt-1 w-full rounded-[1.4rem] border border-stone-300 bg-white px-4 py-3 text-sm text-stone-900 shadow-sm outline-none transition focus:border-stone-400 focus:ring-2 focus:ring-stone-200"
                    placeholder={t('profile.bioPlaceholder')}
                  />
                </FieldWrapper>
                <Button
                  type="submit"
                  className="h-11 rounded-2xl"
                  icon={<Save className="size-4" />}
                  isLoading={updateProfile.isPending}
                >
                  {t('profile.save')}
                </Button>
              </div>
            )}
          </Form>
        </div>
      </div>
    </div>
  );
};

type EntryProps = {
  label: string;
  value: string;
};

const Entry = ({ label, value }: EntryProps) => (
  <div className="rounded-[1.4rem] bg-stone-50/80 px-4 py-4">
    <dt className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
      {label}
    </dt>
    <dd className="mt-2 text-sm font-medium text-stone-900">{value}</dd>
  </div>
);
