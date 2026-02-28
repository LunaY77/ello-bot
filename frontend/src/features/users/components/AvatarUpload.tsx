import { useTranslation } from 'react-i18next';

import { useUploadAvatar } from '../api/upload-avatar';

import { UploadAvatarRequestSchema } from '@/api/schemas';
import { Button } from '@/components/ui/button';
import { Form, Input } from '@/components/ui/form';

type AvatarUploadProps = {
  onSuccess?: () => void;
};

export const AvatarUpload: React.FC<AvatarUploadProps> = ({ onSuccess }) => {
  const { t } = useTranslation('user');
  const uploadAvatarMutation = useUploadAvatar({
    mutationConfig: {
      onSuccess: onSuccess,
    },
  });

  return (
    <Form
      onSubmit={(values) => {
        uploadAvatarMutation.mutate(values);
      }}
      schema={UploadAvatarRequestSchema}
    >
      {({ register, formState }) => (
        <>
          <Input
            type="url"
            label={t('profile.avatarUrl')}
            error={formState.errors.avatarUrl}
            registration={register('avatarUrl')}
          />
          <div className="mt-4">
            <Button type="submit" isLoading={uploadAvatarMutation.isPending}>
              {t('profile.uploadAvatar')}
            </Button>
          </div>
        </>
      )}
    </Form>
  );
};
