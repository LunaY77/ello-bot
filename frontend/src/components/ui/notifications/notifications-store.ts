/**
 * 通知状态管理 Store
 *
 * 功能说明：
 * 使用 Zustand 管理全局通知状态，支持添加和移除通知。
 *
 * 为什么使用 Zustand：
 * - 轻量级状态管理库
 * - 不需要 Provider 包裹
 * - 支持在组件外部访问状态（如 API 拦截器中）
 */

import { nanoid } from 'nanoid';
import { create } from 'zustand';

/**
 * 通知类型定义
 */
export type Notification = {
  /** 通知唯一标识 */
  id: string;
  /** 通知类型：info | warning | success | error */
  type: 'info' | 'warning' | 'success' | 'error';
  /** 通知标题 */
  title: string;
  /** 通知详细消息（可选） */
  message?: string;
};

/**
 * 通知 Store 类型定义
 */
type NotificationsStore = {
  /** 通知列表 */
  notifications: Notification[];
  /** 添加通知 */
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  /** 移除通知 */
  dismissNotification: (id: string) => void;
};

/**
 * 通知状态管理 Hook
 *
 * @example
 * // 在组件中使用
 * const { notifications, addNotification, dismissNotification } = useNotifications();
 *
 * // 添加通知
 * addNotification({
 *   type: 'success',
 *   title: '操作成功',
 *   message: '数据已保存',
 * });
 *
 * // 在组件外部使用（如 API 拦截器）
 * useNotifications.getState().addNotification({
 *   type: 'error',
 *   title: '请求失败',
 * });
 */
export const useNotifications = create<NotificationsStore>((set) => ({
  notifications: [],

  // 添加通知
  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        { id: nanoid(), ...notification },
      ],
    })),

  // 移除通知
  dismissNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter(
        (notification) => notification.id !== id,
      ),
    })),
}));
