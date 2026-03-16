import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { userQueryKeys } from './query-keys';

import type {
  UpdateUserProfileRequest,
  UpdateUserSettingsRequest,
} from '@/api/models/req';
import type {
  CurrentUserResponse,
  UserSettingsResponse,
  UserSummaryResponse,
} from '@/api/models/resp';
import { userOperations } from '@/api/operations';
import { useNotifications } from '@/components/ui/notifications';
import { requestApiOperation } from '@/lib/api-client';
import { AUTHENTICATED_USER_QUERY_KEY, useCurrentUser } from '@/lib/auth';
import type { MutationConfig, QueryConfig } from '@/lib/react-query';

const syncCurrentUser = (
  queryClient: ReturnType<typeof useQueryClient>,
  updater: (current: CurrentUserResponse) => CurrentUserResponse,
) => {
  const current = queryClient.getQueryData<CurrentUserResponse>(
    AUTHENTICATED_USER_QUERY_KEY,
  );

  if (!current) {
    return;
  }

  // Keep the auth cache aligned with dedicated feature queries after profile/settings mutations.
  queryClient.setQueryData(AUTHENTICATED_USER_QUERY_KEY, updater(current));
};

export const getProfile = (): Promise<UserSummaryResponse> => {
  return requestApiOperation(userOperations.getProfile);
};

export const profileQueryOptions = () =>
  queryOptions({
    queryKey: userQueryKeys.profile(),
    queryFn: getProfile,
  });

export const useProfile = (
  queryConfig?: QueryConfig<typeof profileQueryOptions>,
) =>
  useQuery({
    ...profileQueryOptions(),
    ...queryConfig,
  });

export const updateProfile = (
  payload: UpdateUserProfileRequest,
): Promise<UserSummaryResponse> => {
  return requestApiOperation(userOperations.updateProfile, { data: payload });
};

type UseUpdateProfileOptions = {
  mutationConfig?: MutationConfig<typeof updateProfile>;
};

export const useUpdateProfile = ({
  mutationConfig,
}: UseUpdateProfileOptions = {}) => {
  const { t: commonT } = useTranslation('common');
  const { addNotification } = useNotifications();
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    ...restConfig,
    mutationFn: updateProfile,
    onSuccess: async (...args) => {
      const [profile] = args;

      queryClient.setQueryData(userQueryKeys.profile(), profile);
      syncCurrentUser(queryClient, (current) => ({
        ...current,
        user: profile,
      }));

      addNotification({
        type: 'success',
        title: commonT('success'),
        message: commonT('notifications.profileUpdated'),
      });

      await onSuccess?.(...args);
    },
  });
};

export const getSettings = (): Promise<UserSettingsResponse> => {
  return requestApiOperation(userOperations.getSettings);
};

export const settingsQueryOptions = () =>
  queryOptions({
    queryKey: userQueryKeys.settings(),
    queryFn: getSettings,
  });

export const useSettings = (
  queryConfig?: QueryConfig<typeof settingsQueryOptions>,
) =>
  useQuery({
    ...settingsQueryOptions(),
    ...queryConfig,
  });

export const updateSettings = (
  payload: UpdateUserSettingsRequest,
): Promise<UserSettingsResponse> => {
  return requestApiOperation(userOperations.updateSettings, { data: payload });
};

type UseUpdateSettingsOptions = {
  mutationConfig?: MutationConfig<typeof updateSettings>;
};

export const useUpdateSettings = ({
  mutationConfig,
}: UseUpdateSettingsOptions = {}) => {
  const { t: commonT } = useTranslation('common');
  const { addNotification } = useNotifications();
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    ...restConfig,
    mutationFn: updateSettings,
    onSuccess: async (...args) => {
      const [settings] = args;

      queryClient.setQueryData(userQueryKeys.settings(), settings);
      syncCurrentUser(queryClient, (current) => ({
        ...current,
        settings,
      }));

      addNotification({
        type: 'success',
        title: commonT('success'),
        message: commonT('notifications.settingsUpdated'),
      });

      await onSuccess?.(...args);
    },
  });
};

export const useCurrentUserSummary = () => {
  const viewer = useCurrentUser();

  return {
    ...viewer,
    data: viewer.data?.user ?? null,
  };
};
