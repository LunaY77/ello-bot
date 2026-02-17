/**
 * 身份验证配置文件
 *
 * 功能说明：
 * - 使用 react-query-auth 库统一管理用户认证状态（服务端状态）
 * - 提供登录、注册、登出、获取用户信息等核心认证功能
 * - 提供 ProtectedRoute 组件，保护需要登录才能访问的路由
 *
 * 关键概念：
 * - react-query-auth：基于 react-query 的认证状态管理库，自动处理用户状态的缓存和同步
 * - 与 useState 的区别：用户状态是服务端状态，不应使用 useState（客户端状态）管理
 * - zod：运行时类型验证库，确保表单数据符合 API 要求
 * - ProtectedRoute：路由守卫，未登录用户会被重定向到登录页
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate, useLocation } from 'react-router';
import { z } from 'zod';

import { paths } from '@/config/paths';
import type { User } from '@/types/api';

import { api } from './api-client';

// ============================================
// API 调用定义（类型、Schema、请求函数）
// ============================================

/**
 * 获取当前登录用户信息
 *
 * 对应后端 API：GET /auth/me
 *
 * 使用场景：
 * - 应用启动时自动检查用户是否已登录
 * - 登录后获取完整的用户信息
 *
 * @returns Promise<User> 用户对象
 */
const getUser = async (): Promise<User | null> => {
  try {
    const response = await api.get('/auth/me');
    return response.data;
  } catch {
    return null;
  }
};

/**
 * 用户查询的 key
 */
const userQueryKey = ['auth', 'user'];

/**
 * 获取用户信息的 Query Options
 */
export const getUserQueryOptions = () => ({
  queryKey: userQueryKey,
  queryFn: getUser,
});

/**
 * 获取当前用户的 Hook
 *
 * 使用 React Query 管理用户状态
 */
export const useUser = () => {
  return useQuery(getUserQueryOptions());
};

// ============================================
// 登录功能
// ============================================

/**
 * 登录表单的输入验证 Schema
 *
 * 使用 zod 进行运行时类型验证，确保：
 * - email 字段存在且格式正确
 * - password 字段存在且至少 6 个字符
 */
export const loginInputSchema = z.object({
  email: z.string().min(1, '请输入邮箱').email('邮箱格式不正确'),
  password: z.string().min(6, '密码至少 6 个字符'),
});

/**
 * 登录输入类型
 *
 * 从 loginInputSchema 自动推导出的 TypeScript 类型
 */
export type LoginInput = z.infer<typeof loginInputSchema>;

/**
 * 使用邮箱和密码登录
 *
 * 对应后端 API：POST /auth/login
 *
 * @param data - 登录表单数据（邮箱和密码）
 * @returns Promise<User> 用户对象
 */
export const loginWithEmailAndPassword = (data: LoginInput): Promise<User> => {
  return api.post('/auth/login', data);
};

// ============================================
// 注册功能
// ============================================

/**
 * 注册表单的输入验证 Schema
 *
 * 验证规则：
 * - email：必填，邮箱格式
 * - username：必填，用户名
 * - password：必填，至少 6 个字符
 */
export const registerInputSchema = z.object({
  email: z.string().min(1, '请输入邮箱').email('邮箱格式不正确'),
  username: z.string().min(1, '请输入用户名'),
  password: z.string().min(6, '密码至少 6 个字符'),
});

/**
 * 注册输入类型
 *
 * 从 registerInputSchema 自动推导出的 TypeScript 类型
 */
export type RegisterInput = z.infer<typeof registerInputSchema>;

/**
 * 使用邮箱和密码注册
 *
 * 对应后端 API：POST /auth/register
 *
 * @param data - 注册表单数据
 * @returns Promise<User> 用户对象
 */
export const registerWithEmailAndPassword = (
  data: RegisterInput,
): Promise<User> => {
  return api.post('/auth/register', data);
};

// ============================================
// 登出功能
// ============================================

/**
 * 登出当前用户
 *
 * 对应后端 API：POST /auth/logout
 */
export const logout = (): Promise<void> => {
  return api.post('/auth/logout');
};

/**
 * useLogout Hook 的配置选项
 */
type UseLogoutOptions = {
  /** 登出成功回调 */
  onSuccess?: () => void;
};

/**
 * 登出并清除用户缓存的 Hook
 */
export const useLogout = ({ onSuccess }: UseLogoutOptions = {}) => {
  const queryClient = useQueryClient();

  return {
    mutate: async (_data?: Record<string, unknown>) => {
      await logout();
      queryClient.setQueryData(userQueryKey, null);
      onSuccess?.();
    },
  };
};

/**
 * useLogin Hook 的配置选项
 */
type UseLoginOptions = {
  /** 登录成功回调 */
  onSuccess?: () => void;
};

/**
 * 登录 Hook
 */
export const useLogin = ({ onSuccess }: UseLoginOptions = {}) => {
  const queryClient = useQueryClient();

  return {
    mutate: async (data: LoginInput) => {
      const user = await loginWithEmailAndPassword(data);
      queryClient.setQueryData(userQueryKey, user);
      onSuccess?.();
    },
    isPending: false,
  };
};

/**
 * useRegister Hook 的配置选项
 */
type UseRegisterOptions = {
  /** 注册成功回调 */
  onSuccess?: () => void;
};

/**
 * 注册 Hook
 */
export const useRegister = ({ onSuccess }: UseRegisterOptions = {}) => {
  const queryClient = useQueryClient();

  return {
    mutate: async (data: { firstName: string; lastName: string; email: string; password: string }) => {
      const user = await registerWithEmailAndPassword({
        email: data.email,
        username: `${data.firstName} ${data.lastName}`,
        password: data.password,
      });
      queryClient.setQueryData(userQueryKey, user);
      onSuccess?.();
    },
    isPending: false,
  };
};

// ============================================
// 路由守卫组件
// ============================================

/**
 * 受保护的路由组件
 *
 * 功能：
 * - 检查用户是否已登录
 * - 未登录：重定向到登录页，并记录当前路径（登录后可跳回）
 * - 已登录：渲染子组件
 *
 * 使用方式：
 * ```tsx
 * <ProtectedRoute>
 *   <Dashboard />  // 只有登录用户才能看到
 * </ProtectedRoute>
 * ```
 */
export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const user = useUser();
  const location = useLocation();

  // 加载中，显示空白或加载状态
  if (user.isLoading) {
    return null;
  }

  // user.data 为 null 表示未登录
  if (!user.data) {
    return (
      <Navigate to={paths.auth.login.getHref(location.pathname)} replace />
    );
  }

  // 已登录，渲染子组件
  return children;
};

// ============================================
// AuthLoader 组件
// ============================================

/**
 * AuthLoader 组件的 Props 类型
 */
type AuthLoaderProps = {
  /** 子组件 */
  children: React.ReactNode;
  /** 加载中时渲染的组件 */
  renderLoading: () => React.ReactNode;
};

/**
 * AuthLoader 认证加载器组件
 *
 * 功能：
 * - 在应用启动时检查用户登录状态
 * - 加载中显示 loading 状态
 * - 加载完成后渲染子组件
 *
 * @param children - 子组件
 * @param renderLoading - 加载中时渲染的组件
 */
export const AuthLoader = ({ children, renderLoading }: AuthLoaderProps) => {
  const user = useUser();

  if (user.isLoading) {
    return <>{renderLoading()}</>;
  }

  return <>{children}</>;
};

