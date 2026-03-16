import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { useProfile, useUpdateProfile } from '../api/user';

import {
  updateUserProfileRequestSchemaBioMax,
  updateUserProfileRequestSchemaDisplayNameMax,
  updateUserProfileRequestSchemaTimezoneMax,
} from '@/api/schemas';
import { Button } from '@/components/ui/button';
import { FieldWrapper, Form, Input } from '@/components/ui/form';
import { Spinner } from '@/components/ui/spinner';

const profileFormSchema = z.object({
  displayName: z.string().max(updateUserProfileRequestSchemaDisplayNameMax),
  bio: z.string().max(updateUserProfileRequestSchemaBioMax),
  timezone: z.string().max(updateUserProfileRequestSchemaTimezoneMax),
});

export const ProfileForm = () => {
  const { t } = useTranslation('user');
  const profileQuery = useProfile();
  const updateProfile = useUpdateProfile();

  if (profileQuery.isLoading || !profileQuery.data) {
    return (
      <div className="flex min-h-[240px] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const profile = profileQuery.data;

  return (
    <div className="rounded-xl border border-border-default bg-surface-2 p-6 shadow-1">
      <Form
        key={profile.updatedAt}
        onSubmit={(values) => {
          updateProfile.mutate({
            displayName: values.displayName?.trim() || null,
            bio: values.bio?.trim() || null,
            timezone: values.timezone?.trim() || null,
          });
        }}
        schema={profileFormSchema}
        options={{
          defaultValues: {
            displayName: profile.displayName ?? '',
            bio: profile.bio ?? '',
            timezone: profile.timezone ?? '',
          },
        }}
      >
        {({ register, formState }) => (
          <div className="space-y-5">
            <div>
              <p className="text-micro font-semibold uppercase tracking-[0.24em] text-tertiary">
                {t('profile.editEyebrow')}
              </p>
              <h3 className="mt-2 text-xl font-semibold text-primary">
                {t('profile.editTitle')}
              </h3>
              <p className="mt-2 text-sm leading-6 text-secondary">
                {t('profile.editDescription')}
              </p>
            </div>
            <Input
              type="text"
              label={t('profile.displayName')}
              error={formState.errors.displayName}
              registration={register('displayName')}
              className="h-11 rounded-md border-border-default bg-surface-1"
            />
            <Input
              type="text"
              label={t('profile.timezone')}
              error={formState.errors.timezone}
              registration={register('timezone')}
              className="h-11 rounded-md border-border-default bg-surface-1"
            />
            <FieldWrapper
              label={t('profile.bio')}
              error={formState.errors.bio}
              htmlFor="profile-bio"
            >
              <textarea
                {...register('bio')}
                id="profile-bio"
                rows={6}
                className="w-full rounded-md border border-border-default bg-surface-1 px-4 py-3 text-sm text-primary shadow-none outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
                placeholder={t('profile.bioPlaceholder')}
              />
            </FieldWrapper>
            <Button
              type="submit"
              className="h-11 rounded-md"
              isLoading={updateProfile.isPending}
            >
              {t('profile.save')}
            </Button>
          </div>
        )}
      </Form>
    </div>
  );
};
