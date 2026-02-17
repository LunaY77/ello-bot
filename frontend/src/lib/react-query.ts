/**
 * React Query 配置文件
 *
 * 功能说明：
 * - 配置 react-query 的全局行为
 * - 定义类型安全的 Query 和 Mutation 配置类型
 * - 统一管理 API 请求的类型定义
 *
 * 关键概念：
 * - React Query（@tanstack/react-query）：管理服务端状态的库
 * - Query：获取数据（GET 请求）
 * - Mutation：修改数据（POST、PUT、DELETE 请求）
 * - 服务端状态：存储在服务器、通过 API 获取的数据
 *
 * 与 useState 的区别：
 * - useState：管理客户端状态（UI 交互状态、表单输入等）
 * - React Query：管理服务端状态（用户信息、商品列表等）
 * - 服务端状态不应该放在 useState 中，因为它可能被其他用户或设备修改
 */

import { type UseMutationOptions, type DefaultOptions } from '@tanstack/react-query';

// ============================================
// React Query 全局配置
// ============================================

/**
 * React Query 全局配置
 *
 * 作用：
 * - 为所有 Query 和 Mutation 设置默认行为
 * - 避免在每个 API 调用时重复配置
 *
 * 配置说明：
 * - refetchOnWindowFocus: false - 窗口获得焦点时不自动重新获取数据
 *   - 默认值为 true，但会频繁触发不必要的 API 请求
 *   - 设置为 false 可以减少服务器负载
 * - retry: false - 请求失败时不自动重试
 *   - 默认值为 3，会在失败时重试 3 次
 *   - 设置为 false 可以快速失败并显示错误
 * - staleTime: 1000 * 60 - 数据在 60 秒内被认为是"新鲜的"
 *   - 在此期间不会重新请求数据
 *   - 减少不必要的 API 调用，提升性能
 */
export const queryConfig = {
  queries: {
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 1000 * 60, // 60 秒
  },
} satisfies DefaultOptions;

// ============================================
// 类型工具
// ============================================

/**
 * 提取 API 函数的返回类型
 *
 * 这是一个 TypeScript 高级类型（Type-Level Programming）
 *
 * 作用：
 * - 自动推导 API 函数返回的 Promise 中的数据类型
 * - 避免手动维护类型，减少错误
 *
 * 示例：
 * ```ts
 * const getUser = (): Promise<User> => api.get('/auth/me');
 *
 * // ApiFnReturnType<typeof getUser> 等于 User
 * type UserType = ApiFnReturnType<typeof getUser>; // User
 * ```
 */
export type ApiFnReturnType<FnType extends (...args: never[]) => Promise<unknown>> =
  Awaited<ReturnType<FnType>>;

/**
 * Query 配置类型
 *
 * 作用：
 * - 为 useQuery hook 提供类型安全的配置
 * - 自动推导 useQuery 返回的数据类型
 *
 * 类型说明：
 * - T 是一个返回 useQuery 配置对象的函数
 * - Omit 排除 queryKey 和 queryFn，只保留其他配置选项
 *
 * 使用场景：
 * ```ts
 * const useUsers = (config?: QueryConfig<typeof fetchUsers>) => {
 *   return useQuery({
 *     ...config,  // config 的类型会被自动推导
 *     queryKey: ['users'],
 *     queryFn: fetchUsers,
 *   });
 * };
 * ```
 */
export type QueryConfig<T extends (...args: never[]) => unknown> = Omit<
  ReturnType<T>,
  'queryKey' | 'queryFn'
>;

/**
 * Mutation 配置类型
 *
 * 作用：
 * - 为 useMutation hook 提供类型安全的配置
 * - 自动推导 mutation 函数的参数和返回值类型
 *
 * 类型说明：
 * - MutationFnType：mutation 函数类型
 * - ApiFnReturnType<MutationFnType>：mutation 的返回值类型（成功后的数据）
 * - Error：错误类型（固定为 Error）
 * - Parameters<MutationFnType>[0]：mutation 函数的第一个参数类型
 *
 * 使用场景：
 * ```ts
 * const useLogin = (config?: MutationConfig<typeof loginFn>) => {
 *   return useMutation({
 *     ...config,  // config 的类型会被自动推导
 *     mutationFn: loginFn,
 *   });
 * };
 * ```
 */
export type MutationConfig<
  MutationFnType extends (...args: never[]) => Promise<unknown>,
> = UseMutationOptions<
  ApiFnReturnType<MutationFnType>, // 返回值类型
  Error, // 错误类型
  Parameters<MutationFnType>[0] // 参数类型
>;
