import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { sessionsQueryKeys } from './query-keys';

import type { SessionInfoResponse } from '@/api/models/resp';
import { sessionsOperations } from '@/api/operations';
import { useNotifications } from '@/components/ui/notifications';
import { requestApiOperation } from '@/lib/api-client';
import { AUTHENTICATED_USER_QUERY_KEY } from '@/lib/auth';
import type { MutationConfig, QueryConfig } from '@/lib/react-query';
import { getUserStoreState } from '@/store/user';

export const listSessions = (): Promise<SessionInfoResponse[]> => {
  return requestApiOperation(sessionsOperations.listSessions);
};

export const sessionsQueryOptions = () =>
  queryOptions({
    queryKey: sessionsQueryKeys.list(),
    queryFn: listSessions,
  });

export const useSessions = (
  queryConfig?: QueryConfig<typeof sessionsQueryOptions>,
) =>
  useQuery({
    ...sessionsQueryOptions(),
    ...queryConfig,
  });

export const logoutAllSessions = async (): Promise<void> => {
  await requestApiOperation(sessionsOperations.logoutAll);
};

type UseLogoutAllSessionsOptions = {
  mutationConfig?: MutationConfig<typeof logoutAllSessions>;
};

export const useLogoutAllSessions = ({
  mutationConfig,
}: UseLogoutAllSessionsOptions = {}) => {
  const { t } = useTranslation('common');
  const { addNotification } = useNotifications();
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    ...restConfig,
    mutationFn: logoutAllSessions,
    onSuccess: async (...args) => {
      getUserStoreState().clearSession();
      queryClient.removeQueries({ queryKey: sessionsQueryKeys.all() });
      queryClient.setQueryData(AUTHENTICATED_USER_QUERY_KEY, null);

      addNotification({
        type: 'success',
        title: t('notifications.signedOut'),
        message: t('notifications.signedOutAllSessions'),
      });

      await onSuccess?.(...args);
    },
  });
};
