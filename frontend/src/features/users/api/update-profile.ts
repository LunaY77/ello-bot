/**
 * updateProfile 更新用户资料 API
 *
 * 功能说明：
 * 更新当前登录用户的个人资料。
 */

import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';

import { api } from '@/lib/api-client';
import { useUser } from '@/lib/auth';
import { MutationConfig } from '@/lib/react-query';

/**
 * 更新资料的输入验证 Schema
 */
export const updateProfileInputSchema = z.object({
  /** 邮箱 */
  email: z.string().min(1, '请输入邮箱').email('请输入有效的邮箱地址'),
  /** 名 */
  firstName: z.string().min(1, '请输入名'),
  /** 姓 */
  lastName: z.string().min(1, '请输入姓'),
  /** 简介 */
  bio: z.string(),
});

/**
 * 更新资料的输入类型
 */
export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;

/**
 * 更新用户资料
 *
 * @param data - 更新的资料数据
 * @returns API 响应
 */
export const updateProfile = ({ data }: { data: UpdateProfileInput }) => {
  return api.patch(`/users/profile`, data);
};

/**
 * useUpdateProfile Hook 的配置选项
 */
type UseUpdateProfileOptions = {
  /** React Query Mutation 配置 */
  mutationConfig?: MutationConfig<typeof updateProfile>;
};

/**
 * useUpdateProfile Hook
 *
 * 更新用户资料的 React Query Mutation Hook
 * 更新成功后自动刷新用户信息
 *
 * @param options - 配置选项
 * @returns React Query Mutation 结果
 *
 * @example
 * const updateProfile = useUpdateProfile({
 *   mutationConfig: {
 *     onSuccess: () => {
 *       console.log('资料已更新');
 *     },
 *   },
 * });
 * updateProfile.mutate({
 *   data: { email: 'new@email.com', firstName: '张', lastName: '三', bio: '简介' }
 * });
 */
export const useUpdateProfile = ({
  mutationConfig,
}: UseUpdateProfileOptions = {}) => {
  const { refetch: refetchUser } = useUser();

  const { onSuccess, ...restConfig } = mutationConfig || {};

  return useMutation({
    onSuccess: (...args) => {
      // 更新成功后刷新用户信息
      refetchUser();
      onSuccess?.(...args);
    },
    ...restConfig,
    mutationFn: updateProfile,
  });
};
