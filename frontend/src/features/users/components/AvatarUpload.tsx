import { useTranslation } from 'react-i18next';

import { useUploadAvatar } from '../api/upload-avatar';

import { UpdateAvatarRequestSchema } from '@/api/schemas';
import { Button } from '@/components/ui/button';
import { Form, Input } from '@/components/ui/form';
import { Spinner } from '@/components/ui/spinner';
import { getViewerAvatarUrl, useCurrentUser } from '@/lib/auth';

type AvatarUploadProps = {
  onSuccess?: () => void;
};

export const AvatarUpload: React.FC<AvatarUploadProps> = ({ onSuccess }) => {
  const { t } = useTranslation('user');
  const { data: viewer, isLoading } = useCurrentUser();
  const uploadAvatarMutation = useUploadAvatar({
    mutationConfig: {
      onSuccess: onSuccess,
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        {viewer ? (
          getViewerAvatarUrl(viewer) ? (
            <img
              src={getViewerAvatarUrl(viewer)}
              alt={viewer.principal.displayName}
              className="size-16 rounded-[1.4rem] object-cover"
            />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-[1.4rem] bg-stone-200 text-xl font-semibold text-stone-900">
              {viewer.principal.displayName.charAt(0).toUpperCase()}
            </div>
          )
        ) : null}
        <div>
          <p className="text-sm font-medium text-stone-900">
            {t('profile.avatarPreview')}
          </p>
          <p className="mt-1 text-sm text-stone-600">
            {t('profile.avatarPreviewHint')}
          </p>
        </div>
      </div>

      <Form
        onSubmit={(values) => {
          uploadAvatarMutation.mutate(values);
        }}
        schema={UpdateAvatarRequestSchema}
        options={{
          defaultValues: {
            avatarUrl: viewer?.user?.avatarUrl ?? '',
          },
        }}
      >
        {({ register, formState }) => (
          <>
            <Input
              type="url"
              label={t('profile.avatarUrl')}
              error={formState.errors.avatarUrl}
              registration={register('avatarUrl')}
              placeholder={t('profile.avatarPlaceholder')}
              className="h-11 rounded-2xl border-stone-300 bg-white"
            />
            <div className="mt-4">
              <Button
                type="submit"
                className="h-11 rounded-2xl"
                isLoading={uploadAvatarMutation.isPending}
              >
                {t('profile.uploadAvatar')}
              </Button>
            </div>
          </>
        )}
      </Form>
    </div>
  );
};
