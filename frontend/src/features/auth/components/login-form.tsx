/**
 * LoginForm 登录表单组件
 *
 * 功能说明：
 * 用户登录表单，包含邮箱和密码输入。
 * 使用 react-hook-form 和 zod 进行表单验证。
 */

import { Link } from 'react-router';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Form, Input } from '@/components/ui/form';
import { paths } from '@/config/paths';
import { useLogin } from '@/lib/auth';

/**
 * 登录表单验证 Schema
 */
const loginSchema = z.object({
  email: z.string().min(1, '请输入邮箱').email('请输入有效的邮箱地址'),
  password: z.string().min(1, '请输入密码'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

/**
 * LoginForm 组件的 Props 类型
 */
type LoginFormProps = {
  /** 登录成功回调 */
  onSuccess: () => void;
};

/**
 * LoginForm 登录表单组件
 *
 * @param onSuccess - 登录成功后的回调函数
 *
 * @example
 * <LoginForm onSuccess={() => navigate('/app')} />
 */
export const LoginForm = ({ onSuccess }: LoginFormProps) => {
  const login = useLogin({ onSuccess });

  return (
    <div>
      <Form<LoginFormValues, typeof loginSchema>
        onSubmit={(values) => {
          login.mutate(values);
        }}
        schema={loginSchema}
      >
        {({ register, formState }) => (
          <>
            <Input
              type="email"
              label="邮箱"
              error={formState.errors.email}
              registration={register('email')}
            />
            <Input
              type="password"
              label="密码"
              error={formState.errors.password}
              registration={register('password')}
            />
            <div className="mt-6">
              <Button
                type="submit"
                className="w-full"
                isLoading={login.isPending}
              >
                登录
              </Button>
            </div>
          </>
        )}
      </Form>
      <div className="mt-4 text-center text-sm text-gray-600">
        还没有账号？{' '}
        <Link
          to={paths.auth.register.getHref()}
          className="font-medium text-blue-600 hover:text-blue-500"
        >
          立即注册
        </Link>
      </div>
    </div>
  );
};
