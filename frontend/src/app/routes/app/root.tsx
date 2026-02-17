/**
 * AppRoot 应用根路由
 *
 * 功能说明：
 * 应用主界面的根组件，包含 DashboardLayout 布局。
 * 子路由通过 Outlet 渲染。
 */

import { Outlet } from 'react-router';

import { DashboardLayout } from '@/components/layouts';

/**
 * ErrorBoundary 错误边界组件
 * 捕获应用路由内的错误
 */
export const ErrorBoundary = () => {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-red-500">出错了</h1>
        <p className="mt-2 text-gray-500">应用遇到了一个错误，请刷新页面重试</p>
      </div>
    </div>
  );
};

/**
 * AppRoot 应用根组件
 *
 * 使用 DashboardLayout 包裹子路由，
 * 子路由内容通过 Outlet 渲染。
 */
const AppRoot = () => {
  return (
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  );
};

export default AppRoot;
