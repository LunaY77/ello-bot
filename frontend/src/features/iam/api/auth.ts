import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import type { SwitchTenantRequest } from '@/api/models/req';
import type { AuthMeResponse, AuthTokenResponse } from '@/api/models/resp';
import { useNotifications } from '@/components/ui/notifications';
import { api } from '@/lib/api-client';
import { AUTHENTICATED_USER_QUERY_KEY } from '@/lib/auth';
import type { MutationConfig, QueryConfig } from '@/lib/react-query';
import { getUserStoreState } from '@/store/user';

export type SessionInfo = {
  id: number;
  tenantId: number;
  userAgent: string;
  ipAddress: string;
  expiresAt: string;
  lastSeenAt?: string | null;
};

export const listSessions = (): Promise<SessionInfo[]> => {
  return api.get('/iam/auth/sessions');
};

export const authSessionsQueryOptions = () =>
  queryOptions({
    queryKey: ['auth-sessions'],
    queryFn: listSessions,
  });

export const useAuthSessions = (
  queryConfig?: QueryConfig<typeof authSessionsQueryOptions>,
) =>
  useQuery({
    ...authSessionsQueryOptions(),
    ...queryConfig,
  });

export const revokeSession = async (sessionId: number): Promise<void> => {
  await api.delete(`/iam/auth/sessions/${sessionId}`);
};

export const logoutAllSessions = async (): Promise<void> => {
  await api.post('/iam/auth/logout-all');
};

export const switchTenant = async (
  payload: SwitchTenantRequest,
): Promise<AuthMeResponse> => {
  const session: AuthTokenResponse = await api.post(
    '/iam/auth/switch-tenant',
    payload,
  );
  getUserStoreState().setSession({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  });
  return api.get('/iam/auth/me');
};

type UseSwitchTenantOptions = {
  mutationConfig?: MutationConfig<typeof switchTenant>;
};

export const useSwitchTenant = ({
  mutationConfig,
}: UseSwitchTenantOptions = {}) => {
  const { t } = useTranslation('common');
  const queryClient = useQueryClient();
  const { addNotification } = useNotifications();
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    ...restConfig,
    mutationFn: switchTenant,
    onSuccess: async (...args) => {
      // Switching tenant changes the viewer plus every admin surface scoped by workspace.
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: AUTHENTICATED_USER_QUERY_KEY,
        }),
        queryClient.invalidateQueries({ queryKey: ['auth-sessions'] }),
        // IAM-admin screens are all backed by the shared iam query namespace.
        queryClient.invalidateQueries({ queryKey: ['iam'] }),
      ]);

      const [viewer] = args;
      addNotification({
        type: 'success',
        title: t('notifications.tenantSwitched'),
        message: t('notifications.currentWorkspace', {
          workspace: viewer.tenant.name,
        }),
      });

      await onSuccess?.(...args);
    },
  });
};

type UseRevokeSessionOptions = {
  mutationConfig?: MutationConfig<typeof revokeSession>;
};

export const useRevokeSession = ({
  mutationConfig,
}: UseRevokeSessionOptions = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    ...restConfig,
    mutationFn: revokeSession,
    onSuccess: async (...args) => {
      // Session revocation only changes the session directory, so keep the blast radius narrow.
      await queryClient.invalidateQueries({ queryKey: ['auth-sessions'] });
      await onSuccess?.(...args);
    },
  });
};

type UseLogoutAllSessionsOptions = {
  mutationConfig?: MutationConfig<typeof logoutAllSessions>;
};

export const useLogoutAllSessions = ({
  mutationConfig,
}: UseLogoutAllSessionsOptions = {}) => {
  const { t } = useTranslation('common');
  const queryClient = useQueryClient();
  const { addNotification } = useNotifications();
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    ...restConfig,
    mutationFn: logoutAllSessions,
    onSuccess: async (...args) => {
      // Global logout invalidates the local viewer immediately because this browser is no longer trusted either.
      getUserStoreState().clearSession();
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
