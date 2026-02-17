/**
 * NotFoundRoute 404 页面路由
 *
 * 功能说明：
 * 当用户访问不存在的页面时显示的 404 错误页面。
 */

import { Link } from '@/components/ui/link';
import { paths } from '@/config/paths';

/**
 * 404 页面路由组件
 *
 * 显示友好的错误提示和返回首页链接
 */
const NotFoundRoute = () => {
  return (
    <div className="mt-52 flex flex-col items-center font-semibold">
      <h1 className="text-4xl text-gray-900">404</h1>
      <p className="mt-2 text-gray-500">抱歉，您访问的页面不存在</p>
      <Link to={paths.home.getHref()} replace className="mt-4">
        返回首页
      </Link>
    </div>
  );
};

export default NotFoundRoute;
