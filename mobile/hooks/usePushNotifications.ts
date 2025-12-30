/**
 * usePushNotifications - Hook for managing push notifications
 * @requirements Task 12 - Push Notifications
 */

import { useState, useEffect, useCallback } from 'react';
import { getNotificationService, NotificationPermissionResult } from '../services/NotificationService';
import type { MobileSettings } from '../../types/mobile';

export interface UsePushNotificationsReturn {
  isSupported: boolean;
  permission: NotificationPermissionResult;
  requestPermission: () => Promise<boolean>;
  updateSettings: (settings: MobileSettings['notifications']) => void;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const notificationService = getNotificationService();
  const [permission, setPermission] = useState<NotificationPermissionResult>(
    notificationService.getPermissionStatus()
  );

  useEffect(() => {
    notificationService.initialize();
    setPermission(notificationService.getPermissionStatus());
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    const granted = await notificationService.requestPermission();
    setPermission(notificationService.getPermissionStatus());
    return granted;
  }, []);

  const updateSettings = useCallback((settings: MobileSettings['notifications']) => {
    notificationService.updateSettings(settings);
  }, []);

  return {
    isSupported: notificationService.isSupported(),
    permission,
    requestPermission,
    updateSettings,
  };
}

export default usePushNotifications;
