/**
 * API 客户端配置文件
 *
 * 功能说明：
 * - 创建并配置全局 axios 实例，用于所有后端 API 请求
 * - 实现请求拦截器：自动添加认证信息和设置请求头
 * - 实现响应拦截器：统一处理错误响应、错误提示和 401 重定向
 *
 * 关键概念：
 * - axios 拦截器（Interceptor）：在请求发送前或响应接收后进行统一处理的机制
 * - withCredentials：允许跨域请求携带 Cookie（用于 Session 认证）
 * - 401 重定向：当 token 过期或未认证时，自动跳转到登录页
 */

import Axios, { type InternalAxiosRequestConfig } from 'axios';

import { useNotifications } from '@/components/ui/notifications';
import { env } from '@/config/env';
import { paths } from '@/config/paths';

/**
 * 请求拦截器
 *
 * 作用：
 * - 在每个请求发送前自动执行
 * - 设置 Accept 头为 application/json，告诉后端我们期望接收 JSON 格式的响应
 * - 启用 withCredentials，允许携带 Cookie（对于基于 Session 的认证至关重要）
 *
 * @param config - axios 请求配置对象
 * @returns 修改后的请求配置
 */
function authRequestInterceptor(config: InternalAxiosRequestConfig) {
  if (config.headers) {
    config.headers.Accept = 'application/json';
  }

  config.withCredentials = true;
  return config;
}

/**
 * 全局 axios 实例
 *
 * 所有 API 请求都应该使用此实例，而非直接使用 axios
 * baseURL 从环境变量中读取，便于在不同环境（开发、测试、生产）切换
 */
export const api = Axios.create({
  baseURL: env.API_URL,
});

/**
 * 注册请求拦截器
 *
 * 拦截器链：请求发送前 -> authRequestInterceptor -> 发送到服务器
 */
api.interceptors.request.use(authRequestInterceptor);

/**
 * 注册响应拦截器
 *
 * 拦截器链：服务器响应 -> 响应拦截器 -> 返回数据给调用方
 *
 * 成功响应处理：
 * - 自动解包 response.data，调用方直接获取数据，无需每次写 response.data
 *
 * 错误响应处理：
 * - 显示错误通知（使用 zustand store 管理的全局通知系统）
 * - 401 状态码：未认证或 token 过期，重定向到登录页并记录原目标页面
 * - 返回 rejected Promise，让调用方可以进一步处理（如显示特定错误）
 */
api.interceptors.response.use(
  (response) => {
    // 成功响应：直接返回 data 部分，简化调用方的代码
    return response.data;
  },
  (error) => {
    // 错误响应：统一处理
    const message = error.response?.data?.message || error.message;

    // 显示全局错误通知
    useNotifications.getState().addNotification({
      type: 'error',
      title: '错误',
      message,
    });

    // 401 未认证：跳转到登录页
    if (error.response?.status === 401) {
      const searchParams = new URLSearchParams();
      const redirectTo =
        searchParams.get('redirectTo') || window.location.pathname;
      // 保存当前路径，登录后可以跳回
      window.location.href = paths.auth.login.getHref(redirectTo);
    }

    // 必须返回 rejected Promise，让上层可以捕获错误
    return Promise.reject(error);
  },
);
