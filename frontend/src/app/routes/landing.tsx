/**
 * LandingRoute 首页路由
 *
 * 功能说明：
 * 应用的首页/落地页，展示应用介绍和入口按钮。
 * 根据用户登录状态，点击按钮跳转到不同页面。
 */

import { useNavigate } from 'react-router';

import { Head } from '@/components/seo';
import { Button } from '@/components/ui/button';
import { paths } from '@/config/paths';
import { useUser } from '@/lib/auth';

/**
 * 首页路由组件
 *
 * 功能：
 * - 展示应用介绍
 * - 已登录用户点击按钮跳转到仪表盘
 * - 未登录用户点击按钮跳转到登录页
 */
const LandingRoute = () => {
  const navigate = useNavigate();
  const user = useUser();

  /**
   * 处理开始按钮点击
   * 根据用户登录状态跳转到不同页面
   */
  const handleStart = () => {
    if (user.data) {
      navigate(paths.app.dashboard.getHref());
    } else {
      navigate(paths.auth.login.getHref());
    }
  };

  return (
    <>
      <Head description="欢迎来到 Ello 电商平台" />
      <div className="flex h-screen items-center bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 text-center sm:px-6 lg:px-8 lg:py-16">
          <h2 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            <span className="block">Ello</span>
          </h2>
          <p className="mt-4 text-xl text-gray-500">
            现代化电商平台
          </p>
          <div className="mt-8 flex justify-center">
            <div className="inline-flex rounded-md shadow">
              <Button onClick={handleStart}>
                开始使用
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LandingRoute;
