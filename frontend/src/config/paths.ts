/**
 * 路由配置模块
 *
 * 【核心功能】
 * - 集中管理应用的所有路由路径
 * - 提供类型安全的路由访问方式
 * - 分离路由定义（path）和路由生成逻辑（getHref）
 *
 * 【path 与 getHref 的区别】
 * - path：路由路径定义，用于配置路由系统
 *   - 示例：'users/:userId'（含动态参数 :userId）
 *   - 用途：传递给 <Route path="..." /> 组件
 * - getHref：生成实际 URL 的函数，用于导航链接
 *   - 示例：'/app/users/123'（替换动态参数为实际值）
 *   - 用途：传递给 <Link to="..." /> 或 navigate() 函数
 *
 * 【路由层级结构】
 * - /：首页（公开访问）
 * - /auth：认证相关页面（登录、注册）
 * - /app：应用主界面（需要认证）
 *   - /app/dashboard：仪表板
 *   - /app/users：用户列表
 *   - /app/profile：个人资料
 */

/**
 * 路由配置对象
 *
 * 【as const 的作用】
 * - TypeScript 的类型断言，将对象设置为只读
 * - 启用更精确的类型推断（字面量类型而非宽泛的 string 类型）
 * - 防止运行时意外修改路由配置
 */
export const paths = {
  // ==================== 公开页面 ====================

  /**
   * 首页路由
   * 用途：应用的入口页面，通常展示产品介绍或引导用户登录
   */
  home: {
    path: '/',
    getHref: () => '/',
  },

  // ==================== 认证相关页面 ====================

  /**
   * 认证页面组
   * 包含用户注册和登录功能
   */
  auth: {
    /**
     * 注册页面
     * @param redirectTo - 注册成功后重定向的路径（可选）
     */
    register: {
      path: '/auth/register',
      getHref: (redirectTo?: string | null | undefined) =>
        `/auth/register${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`,
    },

    /**
     * 登录页面
     * @param redirectTo - 登录成功后重定向的路径（可选）
     */
    login: {
      path: '/auth/login',
      getHref: (redirectTo?: string | null | undefined) =>
        `/auth/login${redirectTo ? `?redirectTo=${encodeURIComponent(redirectTo)}` : ''}`,
    },
  },

  // ==================== 应用主界面（需要认证）====================

  /**
   * 应用主界面组
   * 所有路由都以 /app 为前缀，需要在路由配置中嵌套定义
   */
  app: {
    /**
     * 应用根路由
     */
    root: {
      path: '/app',
      getHref: () => '/app',
    },

    /**
     * 仪表板页面
     * path 为空字符串表示默认子路由
     */
    dashboard: {
      path: '',
      getHref: () => '/app',
    },

    /**
     * 用户列表页面
     */
    users: {
      path: 'users',
      getHref: () => '/app/users',
    },

    /**
     * 用户详情页面
     * @param id - 用户的唯一标识符
     */
    user: {
      path: 'users/:userId',
      getHref: (id: string) => `/app/users/${id}`,
    },

    /**
     * 个人资料页面
     */
    profile: {
      path: 'profile',
      getHref: () => '/app/profile',
    },
  },
} as const;
