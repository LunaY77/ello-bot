/**
 * deleteUser 删除用户 API
 *
 * 功能说明：
 * 删除指定用户。
 * 仅管理员可调用此接口。
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import { MutationConfig } from '@/lib/react-query';

import { getUsersQueryOptions } from './get-users';

/**
 * 删除用户的请求参数
 */
export type DeleteUserDTO = {
  /** 用户 ID */
  userId: string;
};

/**
 * 删除用户
 *
 * @param userId - 要删除的用户 ID
 * @returns API 响应
 */
export const deleteUser = ({ userId }: DeleteUserDTO) => {
  return api.delete(`/users/${userId}`);
};

/**
 * useDeleteUser Hook 的配置选项
 */
type UseDeleteUserOptions = {
  /** React Query Mutation 配置 */
  mutationConfig?: MutationConfig<typeof deleteUser>;
};

/**
 * useDeleteUser Hook
 *
 * 删除用户的 React Query Mutation Hook
 * 删除成功后自动刷新用户列表
 *
 * @param options - 配置选项
 * @returns React Query Mutation 结果
 *
 * @example
 * const deleteUser = useDeleteUser({
 *   mutationConfig: {
 *     onSuccess: () => {
 *       console.log('用户已删除');
 *     },
 *   },
 * });
 * deleteUser.mutate({ userId: '123' });
 */
export const useDeleteUser = ({
  mutationConfig,
}: UseDeleteUserOptions = {}) => {
  const queryClient = useQueryClient();

  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    onSuccess: (...args) => {
      // 删除成功后刷新用户列表
      queryClient.invalidateQueries({
        queryKey: getUsersQueryOptions().queryKey,
      });
      onSuccess?.(...args);
    },
    ...restConfig,
    mutationFn: deleteUser,
  });
};
