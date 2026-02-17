/**
 * DashboardRoute 仪表盘路由
 *
 * 功能说明：
 * 应用的仪表盘页面，显示用户欢迎信息和功能概览。
 */

import { ContentLayout } from '@/components/layouts';
import { useUser } from '@/lib/auth';
import { ROLES } from '@/lib/authorization';

/**
 * 仪表盘路由组件
 *
 * 显示：
 * - 用户欢迎信息
 * - 用户角色
 * - 根据角色显示可用功能列表
 */
const DashboardRoute = () => {
  const user = useUser();

  return (
    <ContentLayout title="仪表盘">
      <h1 className="text-xl">
        欢迎回来，<b>{`${user.data?.firstName} ${user.data?.lastName}`}</b>
      </h1>
      <h4 className="my-3">
        您的角色是：<b>{user.data?.role === ROLES.ADMIN ? '管理员' : '用户'}</b>
      </h4>
      <p className="font-medium">在此应用中您可以：</p>
      {user.data?.role === ROLES.USER && (
        <ul className="my-4 list-inside list-disc">
          <li>浏览商品</li>
          <li>管理购物车</li>
          <li>查看订单</li>
        </ul>
      )}
      {user.data?.role === ROLES.ADMIN && (
        <ul className="my-4 list-inside list-disc">
          <li>管理用户</li>
          <li>管理商品</li>
          <li>管理订单</li>
          <li>查看统计数据</li>
        </ul>
      )}
    </ContentLayout>
  );
};

export default DashboardRoute;
