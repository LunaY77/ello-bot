/**
 * RegisterForm 注册表单组件
 *
 * 功能说明：
 * 用户注册表单，包含姓名、邮箱和密码输入。
 * 使用 react-hook-form 和 zod 进行表单验证。
 */

import { Link } from 'react-router';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Form, Input } from '@/components/ui/form';
import { paths } from '@/config/paths';
import { useRegister } from '@/lib/auth';

/**
 * 注册表单验证 Schema
 */
const registerSchema = z
  .object({
    firstName: z.string().min(1, '请输入名'),
    lastName: z.string().min(1, '请输入姓'),
    email: z.string().min(1, '请输入邮箱').email('请输入有效的邮箱地址'),
    password: z.string().min(6, '密码至少6个字符'),
    confirmPassword: z.string().min(1, '请确认密码'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: '两次输入的密码不一致',
    path: ['confirmPassword'],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

/**
 * RegisterForm 组件的 Props 类型
 */
type RegisterFormProps = {
  /** 注册成功回调 */
  onSuccess: () => void;
};

/**
 * RegisterForm 注册表单组件
 *
 * @param onSuccess - 注册成功后的回调函数
 *
 * @example
 * <RegisterForm onSuccess={() => navigate('/app')} />
 */
export const RegisterForm = ({ onSuccess }: RegisterFormProps) => {
  const register = useRegister({ onSuccess });

  return (
    <div>
      <Form<RegisterFormValues, typeof registerSchema>
        onSubmit={(values) => {
          register.mutate({
            firstName: values.firstName,
            lastName: values.lastName,
            email: values.email,
            password: values.password,
          });
        }}
        schema={registerSchema}
      >
        {({ register: formRegister, formState }) => (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="text"
                label="名"
                error={formState.errors.firstName}
                registration={formRegister('firstName')}
              />
              <Input
                type="text"
                label="姓"
                error={formState.errors.lastName}
                registration={formRegister('lastName')}
              />
            </div>
            <Input
              type="email"
              label="邮箱"
              error={formState.errors.email}
              registration={formRegister('email')}
            />
            <Input
              type="password"
              label="密码"
              error={formState.errors.password}
              registration={formRegister('password')}
            />
            <Input
              type="password"
              label="确认密码"
              error={formState.errors.confirmPassword}
              registration={formRegister('confirmPassword')}
            />
            <div className="mt-6">
              <Button
                type="submit"
                className="w-full"
                isLoading={register.isPending}
              >
                注册
              </Button>
            </div>
          </>
        )}
      </Form>
      <div className="mt-4 text-center text-sm text-gray-600">
        已有账号？{' '}
        <Link
          to={paths.auth.login.getHref()}
          className="font-medium text-blue-600 hover:text-blue-500"
        >
          立即登录
        </Link>
      </div>
    </div>
  );
};
