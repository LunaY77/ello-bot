/**
 * getUsers 获取用户列表 API
 *
 * 功能说明：
 * 获取系统中所有用户的列表。
 * 仅管理员可调用此接口。
 */

import { queryOptions, useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api-client';
import { QueryConfig } from '@/lib/react-query';
import { User } from '@/types/api';

/**
 * 获取用户列表
 *
 * @returns 用户列表数据
 */
export const getUsers = (): Promise<{ data: User[] }> => {
  return api.get(`/users`);
};

/**
 * 获取用户列表的查询选项
 * 用于 React Query 的 queryOptions
 */
export const getUsersQueryOptions = () => {
  return queryOptions({
    queryKey: ['users'],
    queryFn: getUsers,
  });
};

/**
 * useUsers Hook 的配置选项
 */
type UseUsersOptions = {
  /** React Query 配置 */
  queryConfig?: QueryConfig<typeof getUsersQueryOptions>;
};

/**
 * useUsers Hook
 *
 * 获取用户列表的 React Query Hook
 *
 * @param options - 配置选项
 * @returns React Query 查询结果
 *
 * @example
 * const { data, isLoading } = useUsers();
 */
export const useUsers = ({ queryConfig }: UseUsersOptions = {}) => {
  return useQuery({
    ...getUsersQueryOptions(),
    ...queryConfig,
  });
};
