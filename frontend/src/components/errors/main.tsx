/**
 * MainErrorFallback 主错误回退组件
 *
 * 功能说明：
 * 当应用发生未捕获的错误时显示的回退界面。
 * 提供友好的错误提示和刷新按钮。
 *
 * 使用场景：
 * - 作为 React Error Boundary 的 fallback 组件
 * - 全局错误处理的最后防线
 */

import { Button } from '../ui/button';

/**
 * MainErrorFallback 主错误回退组件
 *
 * @example
 * <ErrorBoundary FallbackComponent={MainErrorFallback}>
 *   <App />
 * </ErrorBoundary>
 */
export const MainErrorFallback = () => {
  return (
    <div
      className="flex h-screen w-screen flex-col items-center justify-center text-red-500"
      role="alert"
    >
      <h2 className="text-lg font-semibold">哎呀，出错了 :(</h2>
      <p className="mt-2 text-sm text-gray-500">
        应用程序遇到了一个意外错误，请尝试刷新页面
      </p>
      <Button
        className="mt-4"
        onClick={() => window.location.assign(window.location.origin)}
      >
        刷新页面
      </Button>
    </div>
  );
};
