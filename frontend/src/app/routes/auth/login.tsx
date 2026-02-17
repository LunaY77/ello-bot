/**
 * LoginRoute 登录页路由
 *
 * 功能说明：
 * 用户登录页面，包含登录表单。
 * 登录成功后跳转到仪表盘或指定的重定向页面。
 */

import { useNavigate, useSearchParams } from 'react-router';

import { AuthLayout } from '@/components/layouts/auth-layout';
import { paths } from '@/config/paths';
import { LoginForm } from '@/features/auth/components/login-form';

/**
 * 登录页路由组件
 *
 * 功能：
 * - 显示登录表单
 * - 支持 redirectTo 参数，登录成功后跳转到指定页面
 */
const LoginRoute = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirectTo');

  return (
    <AuthLayout title="登录">
      <LoginForm
        onSuccess={() => {
          navigate(
            `${redirectTo ? `${redirectTo}` : paths.app.dashboard.getHref()}`,
            {
              replace: true,
            },
          );
        }}
      />
    </AuthLayout>
  );
};

export default LoginRoute;
