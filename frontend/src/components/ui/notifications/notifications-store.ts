/**
 * Notification State Management Store
 *
 * Functionality:
 * Uses Zustand to manage global notification state, supporting adding and removing notifications.
 *
 * Why use Zustand:
 * - Lightweight state management library
 * - No need for Provider wrapper
 * - Supports accessing state outside components (e.g., in API interceptors)
 */

import { nanoid } from 'nanoid';
import { create } from 'zustand';

/**
 * Notification type definition
 */
export type Notification = {
  /** Unique notification identifier */
  id: string;
  /** Notification type: info | warning | success | error */
  type: 'info' | 'warning' | 'success' | 'error';
  /** Notification title */
  title: string;
  /** Detailed notification message (optional) */
  message?: string;
};

/**
 * Notification Store type definition
 */
type NotificationsStore = {
  /** List of notifications */
  notifications: Notification[];
  /** Add a notification */
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  /** Dismiss a notification */
  dismissNotification: (id: string) => void;
};

/**
 * Notification state management hook
 *
 * @example
 * // In component usage
 * const { notifications, addNotification, dismissNotification } = useNotifications();
 *
 * // Add a notification
 * addNotification({
 *   type: 'success',
 *   title: 'Operation Successful',
 *   message: 'Data has been saved',
 * });
 *
 * // Outside component usage (e.g., in API interceptor)
 * useNotifications.getState().addNotification({
 *   type: 'error',
 *   title: 'Request Failed',
 * });
 */
export const useNotifications = create<NotificationsStore>((set) => ({
  notifications: [],

  // Add a notification
  addNotification: (notification) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        { id: nanoid(), ...notification },
      ],
    })),

  // Dismiss a notification
  dismissNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter(
        (notification) => notification.id !== id,
      ),
    })),
}));
