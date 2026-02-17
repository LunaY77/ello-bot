/**
 * ProfileRoute 个人资料路由
 *
 * 功能说明：
 * 显示和编辑用户个人资料的页面。
 */

import { ContentLayout } from '@/components/layouts';
import { UpdateProfile } from '@/features/users/components/update-profile';
import { useUser } from '@/lib/auth';

/**
 * Entry 信息条目组件
 * 用于显示标签-值对
 */
type EntryProps = {
  /** 标签 */
  label: string;
  /** 值 */
  value: string;
};

const Entry = ({ label, value }: EntryProps) => (
  <div className="py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 sm:py-5">
    <dt className="text-sm font-medium text-gray-500">{label}</dt>
    <dd className="mt-1 text-sm text-gray-900 sm:col-span-2 sm:mt-0">
      {value}
    </dd>
  </div>
);

/**
 * 个人资料路由组件
 *
 * 显示用户的个人信息，包括：
 * - 姓名
 * - 邮箱
 * - 角色
 * - 简介
 * - 编辑资料按钮
 */
const ProfileRoute = () => {
  const user = useUser();

  if (!user.data) return null;

  return (
    <ContentLayout title="个人资料">
      <div className="overflow-hidden bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <div className="flex justify-between">
            <h3 className="text-lg font-medium leading-6 text-gray-900">
              用户信息
            </h3>
            <UpdateProfile />
          </div>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            用户的个人详细信息
          </p>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-200">
            <Entry label="名" value={user.data.firstName} />
            <Entry label="姓" value={user.data.lastName} />
            <Entry label="邮箱" value={user.data.email} />
            <Entry label="角色" value={user.data.role === 'ADMIN' ? '管理员' : '用户'} />
            <Entry label="简介" value={user.data.bio || '暂无简介'} />
          </dl>
        </div>
      </div>
    </ContentLayout>
  );
};

export default ProfileRoute;
