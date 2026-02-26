/**
 * Notification Container Component
 *
 * Functionality:
 * Displays all notification messages in a container fixed to the top-right of the page.
 */

import { Notification } from './notification';
import { useNotifications } from './notifications-store';

/**
 * Notification Container Component
 *
 * Uses aria-live="assertive" to ensure screen readers can read notification content
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
