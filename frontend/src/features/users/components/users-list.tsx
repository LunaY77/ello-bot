/**
 * UsersList 用户列表组件
 *
 * 功能说明：
 * 显示系统中所有用户的列表。
 * 包含用户基本信息和删除操作。
 */

import { Spinner } from '@/components/ui/spinner';
import { formatDate } from '@/utils/format';

import { useUsers } from '../api/get-users';

import { DeleteUser } from './delete-user';

/**
 * UsersList 用户列表组件
 *
 * 显示用户列表，包含：
 * - 姓名
 * - 邮箱
 * - 角色
 * - 创建时间
 * - 删除操作
 *
 * @example
 * <UsersList />
 */
export const UsersList = () => {
  const usersQuery = useUsers();

  // 加载状态
  if (usersQuery.isLoading) {
    return (
      <div className="flex h-48 w-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const users = usersQuery.data?.data;

  if (!users) return null;

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              名
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              姓
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              邮箱
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              角色
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              创建时间
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              操作
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {users.map((user) => (
            <tr key={user.id}>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                {user.firstName}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                {user.lastName}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                {user.email}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                {user.role === 'ADMIN' ? '管理员' : '用户'}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                {formatDate(user.createdAt)}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm">
                <DeleteUser id={user.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
