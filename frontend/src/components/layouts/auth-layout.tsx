/**
 * AuthLayout 认证布局组件
 *
 * 功能说明：
 * 为登录、注册等认证页面提供统一的布局结构。
 * 包含 Logo、标题和表单容器的居中布局。
 *
 * 特性：
 * - 自动检测用户登录状态
 * - 已登录用户自动重定向到应用首页
 * - 支持 redirectTo 参数，登录后跳转到指定页面
 */

import * as React from 'react';
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

import { Head } from '@/components/seo';
import { Link } from '@/components/ui/link';
import { paths } from '@/config/paths';
import { useUser } from '@/lib/auth';

/**
 * AuthLayout 组件的 Props 类型
 */
type LayoutProps = {
  /** 子元素（表单内容） */
  children: React.ReactNode;
  /** 页面标题 */
  title: string;
};

/**
 * AuthLayout 认证布局组件
 *
 * @param children - 表单内容
 * @param title - 页面标题，用于 SEO 和页面显示
 *
 * @example
 * <AuthLayout title="登录">
 *   <LoginForm />
 * </AuthLayout>
 */
export const AuthLayout = ({ children, title }: LayoutProps) => {
  const user = useUser();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirectTo');

  const navigate = useNavigate();

  /**
   * 已登录用户自动重定向
   * 如果用户已登录，跳转到 redirectTo 参数指定的页面
   * 或默认跳转到应用首页
   */
  useEffect(() => {
    if (user.data) {
      navigate(redirectTo ? redirectTo : paths.app.dashboard.getHref(), {
        replace: true,
      });
    }
  }, [user.data, navigate, redirectTo]);

  return (
    <>
      <Head title={title} />
      <div className="flex min-h-screen flex-col justify-center bg-gray-50 py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          {/* Logo 区域 */}
          <div className="flex justify-center">
            <Link
              className="flex items-center text-primary"
              to={paths.home.getHref()}
            >
              <span className="text-3xl font-bold">Ello</span>
            </Link>
          </div>

          {/* 标题 */}
          <h2 className="mt-3 text-center text-3xl font-extrabold text-gray-900">
            {title}
          </h2>
        </div>

        {/* 表单容器 */}
        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10">
            {children}
          </div>
        </div>
      </div>
    </>
  );
};
