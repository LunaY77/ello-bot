import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { iamQueryKeys } from './query-keys';

import type {
  ChangeAgentOwnerRequest,
  CreateAgentRequest,
  SetActiveRequest,
  UpdateAgentRequest,
  UpdateAvatarRequest,
} from '@/api/models/req';
import type { AgentAccountResponse, PrincipalResponse } from '@/api/models/resp';
import { api } from '@/lib/api-client';
import type { MutationConfig, QueryConfig } from '@/lib/react-query';

const invalidatePrincipalAgentScope = async (
  queryClient: ReturnType<typeof useQueryClient>,
  principalId: number,
) => {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: iamQueryKeys.agent(principalId),
    }),
    queryClient.invalidateQueries({
      queryKey: iamQueryKeys.principal(principalId),
    }),
  ]);
};

export const listAgents = ({
  tenantId,
}: {
  tenantId?: number | null;
} = {}): Promise<AgentAccountResponse[]> => {
  return api.get('/iam/agents', {
    params: tenantId ? { tenant_id: tenantId } : undefined,
  });
};

export const listAgentsQueryOptions = ({
  tenantId,
}: {
  tenantId?: number | null;
} = {}) =>
  queryOptions({
    queryKey: iamQueryKeys.agentList(tenantId),
    queryFn: () => listAgents({ tenantId }),
  });

type UseAgentsOptions = {
  tenantId?: number | null;
  queryConfig?: QueryConfig<typeof listAgentsQueryOptions>;
};

export const useAgents = ({ tenantId, queryConfig }: UseAgentsOptions = {}) =>
  useQuery({
    ...listAgentsQueryOptions({ tenantId }),
    ...queryConfig,
  });

export const getAgent = (
  principalId: number,
): Promise<AgentAccountResponse> => {
  return api.get(`/iam/agents/${principalId}`);
};

export const getAgentQueryOptions = (principalId: number) =>
  queryOptions({
    queryKey: iamQueryKeys.agent(principalId),
    queryFn: () => getAgent(principalId),
    enabled: Boolean(principalId),
  });

type UseAgentOptions = {
  principalId: number;
  queryConfig?: QueryConfig<typeof getAgentQueryOptions>;
};

export const useAgent = ({ principalId, queryConfig }: UseAgentOptions) =>
  useQuery({
    ...getAgentQueryOptions(principalId),
    ...queryConfig,
  });

export const createAgent = (
  payload: CreateAgentRequest,
): Promise<AgentAccountResponse> => {
  return api.post('/iam/agents', payload);
};

export const updateAgent = ({
  principalId,
  payload,
}: {
  principalId: number;
  payload: UpdateAgentRequest;
}): Promise<AgentAccountResponse> => {
  return api.patch(`/iam/agents/${principalId}`, payload);
};

export const updateAgentAvatar = ({
  principalId,
  payload,
}: {
  principalId: number;
  payload: UpdateAvatarRequest;
}): Promise<AgentAccountResponse> => {
  return api.put(`/iam/agents/${principalId}/avatar`, payload);
};

export const changeAgentOwner = ({
  principalId,
  payload,
}: {
  principalId: number;
  payload: ChangeAgentOwnerRequest;
}): Promise<AgentAccountResponse> => {
  return api.patch(`/iam/agents/${principalId}/owner`, payload);
};

export const setAgentActive = ({
  principalId,
  payload,
}: {
  principalId: number;
  payload: SetActiveRequest;
}): Promise<PrincipalResponse> => {
  return api.patch(`/iam/agents/${principalId}/active`, payload);
};

export const deleteAgent = async ({
  principalId,
}: {
  principalId: number;
}): Promise<void> => {
  await api.delete(`/iam/agents/${principalId}`);
};

type UseCreateAgentOptions = {
  mutationConfig?: MutationConfig<typeof createAgent>;
};

export const useCreateAgent = ({
  mutationConfig,
}: UseCreateAgentOptions = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    ...restConfig,
    mutationFn: createAgent,
    onSuccess: async (...args) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: iamQueryKeys.agents(),
        }),
        queryClient.invalidateQueries({
          queryKey: iamQueryKeys.principals(),
        }),
      ]);
      await onSuccess?.(...args);
    },
  });
};

type UseUpdateAgentOptions = {
  mutationConfig?: MutationConfig<typeof updateAgent>;
};

export const useUpdateAgent = ({
  mutationConfig,
}: UseUpdateAgentOptions = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    ...restConfig,
    mutationFn: updateAgent,
    onSuccess: async (...args) => {
      const [, { principalId }] = args;
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: iamQueryKeys.agents(),
        }),
        invalidatePrincipalAgentScope(queryClient, principalId),
      ]);
      await onSuccess?.(...args);
    },
  });
};

type UseUpdateAgentAvatarOptions = {
  mutationConfig?: MutationConfig<typeof updateAgentAvatar>;
};

export const useUpdateAgentAvatar = ({
  mutationConfig,
}: UseUpdateAgentAvatarOptions = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    ...restConfig,
    mutationFn: updateAgentAvatar,
    onSuccess: async (...args) => {
      const [, { principalId }] = args;
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: iamQueryKeys.agents(),
        }),
        invalidatePrincipalAgentScope(queryClient, principalId),
      ]);
      await onSuccess?.(...args);
    },
  });
};

type UseChangeAgentOwnerOptions = {
  mutationConfig?: MutationConfig<typeof changeAgentOwner>;
};

export const useChangeAgentOwner = ({
  mutationConfig,
}: UseChangeAgentOwnerOptions = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    ...restConfig,
    mutationFn: changeAgentOwner,
    onSuccess: async (...args) => {
      const [, { principalId }] = args;
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: iamQueryKeys.agents(),
        }),
        invalidatePrincipalAgentScope(queryClient, principalId),
      ]);
      await onSuccess?.(...args);
    },
  });
};

type UseSetAgentActiveOptions = {
  mutationConfig?: MutationConfig<typeof setAgentActive>;
};

export const useSetAgentActive = ({
  mutationConfig,
}: UseSetAgentActiveOptions = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    ...restConfig,
    mutationFn: setAgentActive,
    onSuccess: async (...args) => {
      const [, { principalId }] = args;
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: iamQueryKeys.agents(),
        }),
        invalidatePrincipalAgentScope(queryClient, principalId),
      ]);
      await onSuccess?.(...args);
    },
  });
};

type UseDeleteAgentOptions = {
  mutationConfig?: MutationConfig<typeof deleteAgent>;
};

export const useDeleteAgent = ({
  mutationConfig,
}: UseDeleteAgentOptions = {}) => {
  const queryClient = useQueryClient();
  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    ...restConfig,
    mutationFn: deleteAgent,
    onSuccess: async (...args) => {
      const [, { principalId }] = args;
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: iamQueryKeys.agents(),
        }),
        queryClient.removeQueries({
          queryKey: iamQueryKeys.agent(principalId),
        }),
        queryClient.removeQueries({
          queryKey: iamQueryKeys.principal(principalId),
        }),
      ]);
      await onSuccess?.(...args);
    },
  });
};
