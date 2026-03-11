import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import type { UpdateAvatarRequest } from '@/api/models/req';
import type { UserAccountResponse } from '@/api/models/resp';
import { useNotifications } from '@/components/ui/notifications';
import { api } from '@/lib/api-client';
import { AUTHENTICATED_USER_QUERY_KEY } from '@/lib/auth';
import type { MutationConfig } from '@/lib/react-query';

/**
 * Update user avatar. API: PUT /iam/users/me/avatar
 */
export const uploadAvatar = (
  data: UpdateAvatarRequest,
): Promise<UserAccountResponse> => {
  return api.put('/iam/users/me/avatar', data);
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
      queryClient.invalidateQueries({ queryKey: AUTHENTICATED_USER_QUERY_KEY });
      addNotification({
        type: 'success',
        title: t('profile.avatarUpdated'),
      });
      onSuccess?.(...args);
    },
  });
};
