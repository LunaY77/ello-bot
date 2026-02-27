import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { ResetPasswordRequest } from '@/api/models/req';
import { api } from '@/lib/api-client';
import type { MutationConfig } from '@/lib/react-query';
import { getUserStoreState } from '@/store/user';

/**
 * Reset password. API: POST /users/reset-password
 */
export const resetPassword = (data: ResetPasswordRequest): Promise<void> => {
  return api.post('/users/reset-password', data);
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
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    ...restConfig,
    onSuccess: (...args) => {
      getUserStoreState().clearToken();
      queryClient.setQueryData(['authenticated-user'], null);
      onSuccess?.(...args);
    },
    mutationFn: resetPassword,
  });
};
