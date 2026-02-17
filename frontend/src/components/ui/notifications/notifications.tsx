/**
 * 通知容器组件
 *
 * 功能说明：
 * 显示所有通知消息的容器，固定在页面右上角。
 */

import { Notification } from './notification';
import { useNotifications } from './notifications-store';

/**
 * 通知容器组件
 *
 * 使用 aria-live="assertive" 确保屏幕阅读器能够读取通知内容
 */
export const Notifications = () => {
  const { notifications, dismissNotification } = useNotifications();

  return (
    <div
      aria-live="assertive"
      className="pointer-events-none fixed inset-0 z-50 flex flex-col items-end space-y-4 px-4 py-6 sm:items-start sm:p-6"
    >
      {notifications.map((notification) => (
        <Notification
          key={notification.id}
          notification={notification}
          onDismiss={dismissNotification}
        />
      ))}
    </div>
  );
};
