/**
 * NotificationManager Component
 * 
 * Manages notifications using Redux state.
 * Provides a wrapper around the NotificationContainer component.
 * 
 * @requirements 6.3, 6.4
 */

import React, { useEffect } from 'react';
import { NotificationContainer, NotificationItem } from '../../../../../components/Notification';
import { useUI } from '../../../hooks/useUI';

interface NotificationManagerProps {
  className?: string;
}

/**
 * NotificationManager - Displays notifications from Redux state
 * 
 * Automatically dismisses notifications after their duration expires.
 * 
 * @example
 * ```tsx
 * <NotificationManager className="fixed top-4 right-4 z-50" />
 * ```
 * 
 * @requirements 6.3 - Display notifications
 * @requirements 6.4 - Dismiss notifications
 */
export const NotificationManager: React.FC<NotificationManagerProps> = ({ className }) => {
  const { notifications, dismissNotification } = useUI();

  // Auto-dismiss notifications after their duration
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    notifications.forEach((notification) => {
      const duration = notification.duration || 3000;
      const timer = setTimeout(() => {
        dismissNotification(notification.id);
      }, duration);
      timers.push(timer);
    });

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [notifications, dismissNotification]);

  // Convert Redux notifications to NotificationItem format
  const notificationItems: NotificationItem[] = notifications.map((n) => ({
    id: n.id,
    type: n.type,
    message: n.message,
  }));

  return (
    <NotificationContainer
      notifications={notificationItems}
      onRemove={dismissNotification}
      className={className}
    />
  );
};

export default NotificationManager;
