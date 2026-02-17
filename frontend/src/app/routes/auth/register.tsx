/**
 * RegisterRoute 注册页路由
 *
 * 功能说明：
 * 用户注册页面，包含注册表单。
 * 注册成功后跳转到仪表盘或指定的重定向页面。
 */

import { useNavigate, useSearchParams } from 'react-router';

import { AuthLayout } from '@/components/layouts/auth-layout';
import { paths } from '@/config/paths';
import { RegisterForm } from '@/features/auth/components/register-form';

/**
 * 注册页路由组件
 *
 * 功能：
 * - 显示注册表单
 * - 支持 redirectTo 参数，注册成功后跳转到指定页面
 */
const RegisterRoute = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirectTo');

  return (
    <AuthLayout title="注册">
      <RegisterForm
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

export default RegisterRoute;
