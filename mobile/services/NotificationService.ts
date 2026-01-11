/**
 * NotificationService - Push notifications for mobile app
 * @requirements Task 12 - Implementar Push Notifications
 */

import type { MobileNotification, MobileSettings } from '../../types/mobile';

export interface NotificationPermissionResult {
  granted: boolean;
  denied: boolean;
  default: boolean;
}

class NotificationService {
  private static instance: NotificationService;
  private settings: MobileSettings['notifications'] | null = null;
  private swRegistration: ServiceWorkerRegistration | null = null;

  private constructor() {}

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Initialize notification service
   */
  async initialize(): Promise<void> {
    // Load settings
    this.loadSettings();

    // Register service worker if available
    if ('serviceWorker' in navigator) {
      try {
        this.swRegistration = await navigator.serviceWorker.ready;
      } catch (error) {
        console.warn('Service worker not available:', error);
      }
    }
  }

  /**
   * Load notification settings from storage
   */
  private loadSettings(): void {
    try {
      const saved = localStorage.getItem('mobile_settings');
      if (saved) {
        const settings = JSON.parse(saved);
        this.settings = settings.notifications;
      }
    } catch {
      // Use defaults
    }
  }

  /**
   * Check if notifications are supported
   */
  isSupported(): boolean {
    return 'Notification' in window;
  }

  /**
   * Get current permission status
   */
  getPermissionStatus(): NotificationPermissionResult {
    if (!this.isSupported()) {
      return { granted: false, denied: true, default: false };
    }

    return {
      granted: Notification.permission === 'granted',
      denied: Notification.permission === 'denied',
      default: Notification.permission === 'default',
    };
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      return result === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }

  /**
   * Update notification settings
   */
  updateSettings(settings: MobileSettings['notifications']): void {
    this.settings = settings;
  }

  /**
   * Show a notification
   */
  async show(notification: MobileNotification): Promise<void> {
    if (!this.settings?.enabled) return;
    if (!this.getPermissionStatus().granted) return;

    // Check if this notification type is enabled
    if (!this.shouldShowNotification(notification)) return;

    // Use extended notification options (supported by service workers)
    const options: Record<string, unknown> = {
      body: notification.message,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      tag: notification.id,
      timestamp: notification.timestamp,
      vibrate: [200, 100, 200],
      data: notification,
      requireInteraction: notification.type === 'warning' || notification.type === 'error',
    };

    // Add action if present
    if (notification.action) {
      options.actions = [
        {
          action: notification.action.type,
          title: notification.action.label,
        },
      ];
    }

    try {
      if (this.swRegistration) {
        // Use service worker for better reliability
        await this.swRegistration.showNotification(notification.title, options);
      } else {
        // Fallback to regular notification
        new Notification(notification.title, options);
      }
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  /**
   * Check if notification type should be shown based on settings
   */
  private shouldShowNotification(notification: MobileNotification): boolean {
    if (!this.settings) return true;

    // Map notification types to settings
    const typeMap: Record<string, keyof MobileSettings['notifications']> = {
      poll_end: 'pollEnd',
      prediction_lock: 'predictionLock',
      giveaway_winner: 'giveawayWinner',
      timer_end: 'timerEnd',
      new_follower: 'newFollower',
      new_subscriber: 'newSubscriber',
    };

    // Extract type from notification action or title
    const notificationType = notification.action?.type || '';
    const settingKey = typeMap[notificationType];

    if (settingKey && settingKey in this.settings) {
      return this.settings[settingKey] as boolean;
    }

    return true;
  }

  /**
   * Show poll ended notification
   */
  async notifyPollEnded(question: string, winner: string): Promise<void> {
    await this.show({
      id: `poll_${Date.now()}`,
      type: 'info',
      title: '📊 Encuesta finalizada',
      message: `"${question}" - Ganador: ${winner}`,
      timestamp: Date.now(),
      action: { label: 'Ver', type: 'poll_end' },
    });
  }

  /**
   * Show prediction locked notification
   */
  async notifyPredictionLocked(title: string): Promise<void> {
    await this.show({
      id: `prediction_${Date.now()}`,
      type: 'warning',
      title: '🔒 Predicción bloqueada',
      message: `"${title}" - Las apuestas están cerradas`,
      timestamp: Date.now(),
      action: { label: 'Resolver', type: 'prediction_lock' },
    });
  }

  /**
   * Show giveaway winner notification
   */
  async notifyGiveawayWinner(giveawayName: string, winner: string): Promise<void> {
    await this.show({
      id: `giveaway_${Date.now()}`,
      type: 'success',
      title: '🎉 ¡Tenemos ganador!',
      message: `${winner} ganó "${giveawayName}"`,
      timestamp: Date.now(),
      action: { label: 'Ver', type: 'giveaway_winner' },
    });
  }

  /**
   * Show timer ended notification
   */
  async notifyTimerEnded(timerName: string): Promise<void> {
    await this.show({
      id: `timer_${Date.now()}`,
      type: 'info',
      title: '⏰ Timer finalizado',
      message: timerName,
      timestamp: Date.now(),
      action: { label: 'Ver', type: 'timer_end' },
    });
  }

  /**
   * Show new follower notification
   */
  async notifyNewFollower(username: string): Promise<void> {
    await this.show({
      id: `follower_${Date.now()}`,
      type: 'success',
      title: '💜 Nuevo seguidor',
      message: `${username} te sigue`,
      timestamp: Date.now(),
      action: { label: 'Ver', type: 'new_follower' },
    });
  }

  /**
   * Show new subscriber notification
   */
  async notifyNewSubscriber(username: string, tier?: string): Promise<void> {
    await this.show({
      id: `subscriber_${Date.now()}`,
      type: 'success',
      title: '⭐ Nueva suscripción',
      message: tier ? `${username} (${tier})` : username,
      timestamp: Date.now(),
      action: { label: 'Ver', type: 'new_subscriber' },
    });
  }

  /**
   * Clear all notifications
   */
  async clearAll(): Promise<void> {
    if (this.swRegistration) {
      const notifications = await this.swRegistration.getNotifications();
      notifications.forEach(n => n.close());
    }
  }
}

export const getNotificationService = (): NotificationService => {
  return NotificationService.getInstance();
};

export default NotificationService;
