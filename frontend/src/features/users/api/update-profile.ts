import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import type { UpdateUserProfileRequest } from '@/api/models/req';
import type { UserAccountResponse } from '@/api/models/resp';
import { useNotifications } from '@/components/ui/notifications';
import { api } from '@/lib/api-client';
import { AUTHENTICATED_USER_QUERY_KEY } from '@/lib/auth';
import type { MutationConfig } from '@/lib/react-query';

export const updateProfile = (
  payload: UpdateUserProfileRequest,
): Promise<UserAccountResponse> => {
  return api.patch('/iam/users/me', payload);
};

type UseUpdateProfileOptions = {
  mutationConfig?: MutationConfig<typeof updateProfile>;
};

export const useUpdateProfile = ({
  mutationConfig,
}: UseUpdateProfileOptions = {}) => {
  const { t } = useTranslation('user');
  const queryClient = useQueryClient();
  const { addNotification } = useNotifications();
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    ...restConfig,
    mutationFn: updateProfile,
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({
        queryKey: AUTHENTICATED_USER_QUERY_KEY,
      });
      addNotification({
        type: 'success',
        title: t('profile.updated'),
      });
      await onSuccess?.(...args);
    },
  });
};
