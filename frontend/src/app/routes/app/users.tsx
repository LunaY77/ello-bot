/**
 * UsersRoute 用户管理路由
 *
 * 功能说明：
 * 用户管理页面，仅管理员可访问。
 * 显示用户列表和管理功能。
 */

import { QueryClient } from '@tanstack/react-query';

import { ContentLayout } from '@/components/layouts';
import { getUsersQueryOptions } from '@/features/users/api/get-users';
import { UsersList } from '@/features/users/components/users-list';
import { Authorization, ROLES } from '@/lib/authorization';

/**
 * clientLoader 数据预加载
 *
 * 在路由激活前预加载用户列表数据
 *
 * @param queryClient - React Query 客户端实例
 */
export const clientLoader = (queryClient: QueryClient) => async () => {
  const query = getUsersQueryOptions();

  return (
    queryClient.getQueryData(query.queryKey) ??
    (await queryClient.fetchQuery(query))
  );
};

/**
 * 用户管理路由组件
 *
 * 功能：
 * - 仅管理员可访问
 * - 显示用户列表
 * - 支持删除用户操作
 */
const UsersRoute = () => {
  return (
    <ContentLayout title="用户管理">
      <Authorization
        forbiddenFallback={<div>只有管理员可以查看此页面</div>}
        allowedRoles={[ROLES.ADMIN]}
      >
        <UsersList />
      </Authorization>
    </ContentLayout>
  );
};

export default UsersRoute;
