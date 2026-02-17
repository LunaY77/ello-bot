/**
 * 权限控制文件
 *
 * 功能说明：
 * - 实现基于角色的访问控制（RBAC - Role-Based Access Control）
 * - 实现基于策略的访问控制（PBAC - Policy-Based Access Control）
 * - 提供 Authorization 组件，根据权限条件显示/隐藏 UI
 * - 提供 useAuthorization hook，用于在组件中检查权限
 *
 * 关键概念：
 * - RBAC：根据用户角色（ADMIN、USER）控制访问权限
 * - PBAC：根据业务规则（如"只有作者可以删除自己的评论"）控制访问
 * - 前端权限控制：改善用户体验，但不能替代后端权限验证
 */

import * as React from 'react';

import type { User } from '@/types/api';

import { useUser } from './auth';

// ============================================
// 角色定义（RBAC）
// ============================================

/**
 * 用户角色枚举
 *
 * 定义系统中的所有角色及其标识
 * 这些角色值应与后端数据库中的角色定义一致
 */
export enum ROLES {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

/**
 * 角色类型
 *
 * 从 ROLES 枚举推导出的联合类型
 * 用于类型安全：确保只能传入有效的角色名
 */
type RoleTypes = keyof typeof ROLES;

// ============================================
// 权限检查 Hook
// ============================================

/**
 * 权限检查 Hook
 *
 * 功能：
 * - 提供检查用户角色权限的方法
 * - 返回当前用户的角色
 *
 * 使用场景：
 * - 在组件中根据角色显示不同的 UI
 * - 在执行操作前检查权限
 */
export const useAuthorization = () => {
  const user = useUser();

  // 确保用户已登录
  if (!user.data) {
    throw Error('用户未登录！');
  }

  /**
   * 检查用户是否有指定的角色
   *
   * @param allowedRoles - 允许的角色列表
   * @returns 是否有权限
   */
  const checkAccess = React.useCallback(
    ({ allowedRoles }: { allowedRoles: RoleTypes[] }) => {
      if (allowedRoles && allowedRoles.length > 0 && user.data) {
        return allowedRoles?.includes(user.data.role as RoleTypes);
      }

      // 如果没有指定角色限制，默认允许访问
      return true;
    },
    [user.data],
  );

  return { checkAccess, role: user.data.role };
};

// ============================================
// 权限控制组件
// ============================================

/**
 * Authorization 组件的 Props 类型
 *
 * 使用 TypeScript 的联合类型实现"二选一"的参数模式：
 * - 模式 1：基于角色的权限控制（allowedRoles）
 * - 模式 2：基于策略的权限控制（policyCheck）
 */
type AuthorizationProps = {
  /**
   * 无权限时的降级 UI
   * 默认为 null（不渲染任何内容）
   */
  forbiddenFallback?: React.ReactNode;
  /**
   * 有权限时渲染的子组件
   */
  children: React.ReactNode;
} & (
  | {
      /**
       * 模式 1：基于角色的权限控制
       * 传入允许的角色列表，用户角色在其中即可访问
       */
      allowedRoles: RoleTypes[];
      policyCheck?: never;
    }
  | {
      allowedRoles?: never;
      /**
       * 模式 2：基于策略的权限控制
       * 传入布尔值，true 表示有权限
       */
      policyCheck: boolean;
    }
);

/**
 * 权限控制组件
 *
 * 功能：
 * - 根据角色或策略条件，决定是否渲染子组件
 * - 提供 fallback UI，当无权限时显示
 *
 * 使用示例：
 *
 * 基于角色的权限控制（RBAC）：
 * ```tsx
 * <Authorization allowedRoles={['ADMIN']}>
 *   <DeleteUserButton />  // 只有管理员可以看到
 * </Authorization>
 * ```
 *
 * 基于策略的权限控制（PBAC）：
 * ```tsx
 * <Authorization policyCheck={user.id === comment.authorId}>
 *   <DeleteButton />  // 只有作者可以看到
 * </Authorization>
 * ```
 */
export const Authorization = ({
  policyCheck,
  allowedRoles,
  forbiddenFallback = null,
  children,
}: AuthorizationProps) => {
  const { checkAccess } = useAuthorization();

  let canAccess = false;

  // 模式 1：检查角色权限
  if (allowedRoles) {
    canAccess = checkAccess({ allowedRoles });
  }

  // 模式 2：使用策略检查结果
  if (typeof policyCheck !== 'undefined') {
    canAccess = policyCheck;
  }

  // 根据权限状态渲染不同内容
  return <>{canAccess ? children : forbiddenFallback}</>;
};
