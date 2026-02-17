/**
 * AppRouter 应用路由配置
 *
 * 功能说明：
 * 基于 React Router v7 的路由配置，支持懒加载和路由保护。
 *
 * 路由结构：
 * - / : 首页（公开）
 * - /auth/login : 登录页（公开）
 * - /auth/register : 注册页（公开）
 * - /app : 应用主页（需要认证）
 *   - /app : 仪表盘
 *   - /app/users : 用户管理（仅管理员）
 *   - /app/profile : 个人资料
 * - * : 404 页面
 */

import { QueryClient, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import { paths } from '@/config/paths';
import { ProtectedRoute } from '@/lib/auth';

import {
  default as AppRoot,
  ErrorBoundary as AppRootErrorBoundary,
} from './routes/app/root';

/**
 * 路由模块转换函数
 *
 * 将懒加载的路由模块转换为 React Router 可识别的路由配置对象。
 * 主要处理 clientLoader 和 clientAction 的 queryClient 注入。
 *
 * @param queryClient - React Query 客户端实例
 */
const convert = (queryClient: QueryClient) => (m: any) => {
  const { clientLoader, clientAction, default: Component, ...rest } = m;
  return {
    ...rest,
    loader: clientLoader?.(queryClient),
    action: clientAction?.(queryClient),
    Component,
  };
};

/**
 * 创建应用路由器
 *
 * @param queryClient - React Query 客户端实例
 * @returns 配置好的 React Router 实例
 */
export const createAppRouter = (queryClient: QueryClient) =>
  createBrowserRouter([
    // 首页路由（公开访问）
    {
      path: paths.home.path,
      lazy: () => import('./routes/landing').then(convert(queryClient)),
    },
    // 注册页路由（公开访问）
    {
      path: paths.auth.register.path,
      lazy: () => import('./routes/auth/register').then(convert(queryClient)),
    },
    // 登录页路由（公开访问）
    {
      path: paths.auth.login.path,
      lazy: () => import('./routes/auth/login').then(convert(queryClient)),
    },
    // 应用主路由（需要认证）
    {
      path: paths.app.root.path,
      element: (
        <ProtectedRoute>
          <AppRoot />
        </ProtectedRoute>
      ),
      ErrorBoundary: AppRootErrorBoundary,
      children: [
        {
          path: paths.app.users.path,
          lazy: () => import('./routes/app/users').then(convert(queryClient)),
        },
        {
          path: paths.app.profile.path,
          lazy: () => import('./routes/app/profile').then(convert(queryClient)),
        },
        {
          path: paths.app.dashboard.path,
          lazy: () =>
            import('./routes/app/dashboard').then(convert(queryClient)),
        },
      ],
    },
    // 404 页面路由
    {
      path: '*',
      lazy: () => import('./routes/not-found').then(convert(queryClient)),
    },
  ]);

/**
 * AppRouter 应用路由器组件
 *
 * 从 React Query Context 获取 queryClient 实例，
 * 创建路由器并提供给整个应用。
 *
 * @example
 * <AppProvider>
 *   <AppRouter />
 * </AppProvider>
 */
export const AppRouter = () => {
  const queryClient = useQueryClient();
  const router = useMemo(() => createAppRouter(queryClient), [queryClient]);
  return <RouterProvider router={router} />;
};
