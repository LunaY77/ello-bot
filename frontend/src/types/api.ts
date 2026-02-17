/**
 * API 类型定义文件
 *
 * 定义与后端 API 交互的数据类型
 * 这些类型应与后端 API 响应保持一致
 */

/**
 * 用户类型
 *
 * 表示系统中的用户实体
 */
export type User = {
  /** 用户唯一标识 */
  id: string;
  /** 用户邮箱 */
  email: string;
  /** 用户名 */
  username: string;
  /** 名 */
  firstName: string;
  /** 姓 */
  lastName: string;
  /** 用户角色 */
  role: 'ADMIN' | 'USER';
  /** 简介 */
  bio: string;
  /** 头像 URL */
  avatar?: string;
  /** 创建时间 */
  createdAt: string;
  /** 更新时间 */
  updatedAt: string;
};

/**
 * 认证响应类型
 *
 * 登录/注册成功后的响应
 */
export type AuthResponse = {
  /** 用户信息 */
  user: User;
  /** 访问令牌（如果使用 JWT） */
  token?: string;
};

/**
 * 分页响应类型
 *
 * 用于列表接口的分页响应
 */
export type PaginatedResponse<T> = {
  /** 数据列表 */
  data: T[];
  /** 总数 */
  total: number;
  /** 当前页码 */
  page: number;
  /** 每页数量 */
  pageSize: number;
  /** 总页数 */
  totalPages: number;
};

/**
 * API 错误响应类型
 */
export type ApiError = {
  /** 错误消息 */
  message: string;
  /** 错误码 */
  code?: string;
  /** 字段错误（表单验证） */
  errors?: Record<string, string[]>;
};
