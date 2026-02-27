import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import type { UploadAvatarRequest } from '@/api/models/req';
import { useNotifications } from '@/components/ui/notifications';
import { api } from '@/lib/api-client';
import type { MutationConfig } from '@/lib/react-query';

/**
 * Upload user avatar. API: POST /users/avatar
 */
export const uploadAvatar = (data: UploadAvatarRequest): Promise<void> => {
  return api.post('/users/avatar', data);
};

type UseUploadAvatarOptions = {
  mutationConfig?: MutationConfig<typeof uploadAvatar>;
};

/**
 * Hook to upload user avatar using React Query. Automatically handles loading states and errors, and invalidates the authenticated user's data on success to refresh the avatar URL. Also shows a success notification on completion.
 */
export const useUploadAvatar = ({ mutationConfig }: UseUploadAvatarOptions) => {
  const { t } = useTranslation('user');
  const queryClient = useQueryClient();
  const { addNotification } = useNotifications();
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    ...restConfig,
    mutationFn: uploadAvatar,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ['authenticated-user'] });
      addNotification({
        type: 'success',
        title: t('profile.avatarUpdated'),
      });
      onSuccess?.(...args);
    },
  });
};
