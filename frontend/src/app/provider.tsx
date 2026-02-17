/**
 * AppProvider 应用 Provider 配置
 *
 * 功能说明：
 * 该文件定义了应用的顶层 Provider 组件，负责配置和提供所有必要的上下文。
 * Provider 是 React 的核心概念，类似于后端的依赖注入容器或中间件管道。
 *
 * Provider 嵌套顺序（从外到内）：
 * 1. Suspense：处理异步组件加载的 fallback
 * 2. ErrorBoundary：捕获渲染错误，防止白屏
 * 3. HelmetProvider：管理页面元信息（title、meta 等）
 * 4. QueryClientProvider：React Query 的服务端状态管理
 * 5. AuthLoader：认证状态加载
 * 6. children：应用的具体内容
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import * as React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { HelmetProvider } from 'react-helmet-async';

import { MainErrorFallback } from '@/components/errors/main';
import { Notifications } from '@/components/ui/notifications';
import { Spinner } from '@/components/ui/spinner';
import { AuthLoader } from '@/lib/auth';
import { queryConfig } from '@/lib/react-query';

/**
 * AppProvider 组件的 Props 类型
 */
type AppProviderProps = {
  /** 子组件，通常是整个应用的根组件 */
  children: React.ReactNode;
};

/**
 * AppProvider 应用 Provider 组件
 *
 * 为整个应用提供必要的上下文和配置，包括：
 * - React Query 数据获取和缓存
 * - 错误边界处理
 * - SEO 元信息管理
 * - 认证状态管理
 * - 全局通知系统
 *
 * @param children - 子组件，通常是 App 组件或路由器组件
 *
 * @example
 * <AppProvider>
 *   <AppRouter />
 * </AppProvider>
 */
export const AppProvider = ({ children }: AppProviderProps) => {
  /**
   * 创建 QueryClient 实例
   * 使用 useState 的惰性初始化，确保只创建一次
   */
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: queryConfig,
      }),
  );

  return (
    <React.Suspense
      fallback={
        <div className="flex h-screen w-screen items-center justify-center">
          <Spinner size="xl" />
        </div>
      }
    >
      <ErrorBoundary FallbackComponent={MainErrorFallback}>
        <HelmetProvider>
          <QueryClientProvider client={queryClient}>
            {/* 开发环境显示 React Query Devtools */}
            {import.meta.env.DEV && <ReactQueryDevtools />}

            {/* 全局通知组件 */}
            <Notifications />

            {/* 认证状态加载器 */}
            <AuthLoader
              renderLoading={() => (
                <div className="flex h-screen w-screen items-center justify-center">
                  <Spinner size="xl" />
                </div>
              )}
            >
              {children}
            </AuthLoader>
          </QueryClientProvider>
        </HelmetProvider>
      </ErrorBoundary>
    </React.Suspense>
  );
};
