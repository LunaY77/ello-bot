import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import type { ResetPasswordRequest } from '@/api/models/req';
import { useNotifications } from '@/components/ui/notifications';
import { api } from '@/lib/api-client';
import { AUTHENTICATED_USER_QUERY_KEY } from '@/lib/auth';
import type { MutationConfig } from '@/lib/react-query';
import { getUserStoreState } from '@/store/user';

/**
 * Reset password. API: POST /iam/auth/password/reset
 */
export const resetPassword = (data: ResetPasswordRequest): Promise<void> => {
  return api.post('/iam/auth/password/reset', data);
};

type UseResetPasswordOptions = {
  mutationConfig?: MutationConfig<typeof resetPassword>;
};

/**
 * Hook to reset password using React Query. Automatically handles loading states and errors.
 */
export const useResetPassword = ({
  mutationConfig,
}: UseResetPasswordOptions) => {
  const { t } = useTranslation('user');
  const queryClient = useQueryClient();
  const { addNotification } = useNotifications();
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    ...restConfig,
    onSuccess: (...args) => {
      getUserStoreState().clearSession();
      queryClient.setQueryData(AUTHENTICATED_USER_QUERY_KEY, null);
      addNotification({
        type: 'success',
        title: t('resetPassword.success'),
      });
      onSuccess?.(...args);
    },
    mutationFn: resetPassword,
  });
};
