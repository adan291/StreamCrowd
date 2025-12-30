/**
 * PushNotificationService - Service for browser push notifications
 * 
 * This service handles requesting notification permissions, checking permission status,
 * and displaying browser notifications using the Web Notification API.
 * 
 * @requirements 1.1 - WHEN la aplicación inicia por primera vez, THE Push_Notification_Service SHALL solicitar permiso de notificaciones al usuario
 * @requirements 1.2 - WHEN el usuario concede permiso, THE Push_Notification_Service SHALL registrar el Service Worker para notificaciones
 * @requirements 1.3 - WHEN ocurre un evento configurado como notificable, THE Push_Notification_Service SHALL mostrar una notificación del navegador
 * @requirements 1.4 - THE Push_Notification_Service SHALL incluir título, mensaje e icono en cada notificación
 * @requirements 1.5 - WHEN el usuario hace clic en una notificación, THE Push_Notification_Service SHALL enfocar la ventana de la aplicación
 * @requirements 1.6 - IF el usuario deniega permisos, THEN THE Push_Notification_Service SHALL mostrar instrucciones para habilitarlos manualmente
 */

import type {
  IPushNotificationService,
  PushNotificationConfig,
  NotificationEventType,
} from '../../../types/notifications';
import { EVENT_TYPE_EMOJIS } from '../../../types/notifications';

/**
 * Default notification options
 */
const DEFAULT_NOTIFICATION_OPTIONS: NotificationOptions = {
  icon: '/ai-vision-icon.png',
  badge: '/ai-vision-icon.png',
  requireInteraction: false,
  silent: false,
};

/**
 * Instructions for enabling notifications manually in different browsers
 */
export const PERMISSION_INSTRUCTIONS = {
  chrome: 'Click the lock icon in the address bar → Site settings → Notifications → Allow',
  firefox: 'Click the lock icon in the address bar → Connection secure → More Information → Permissions → Notifications → Allow',
  safari: 'Safari → Preferences → Websites → Notifications → Allow for this website',
  edge: 'Click the lock icon in the address bar → Site permissions → Notifications → Allow',
  default: 'Check your browser settings to enable notifications for this site.',
};

/**
 * Detect the current browser
 * @returns Browser name or 'default'
 */
export function detectBrowser(): keyof typeof PERMISSION_INSTRUCTIONS {
  if (typeof navigator === 'undefined') {
    return 'default';
  }
  
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('edg/')) {
    return 'edge';
  }
  if (userAgent.includes('chrome')) {
    return 'chrome';
  }
  if (userAgent.includes('firefox')) {
    return 'firefox';
  }
  if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
    return 'safari';
  }
  
  return 'default';
}

/**
 * Get permission instructions for the current browser
 * @returns Instructions string
 */
export function getPermissionInstructions(): string {
  const browser = detectBrowser();
  return PERMISSION_INSTRUCTIONS[browser];
}

/**
 * Check if the Notification API is supported
 * @returns true if notifications are supported
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 
         'Notification' in window &&
         typeof Notification !== 'undefined';
}

/**
 * Get the current notification permission status
 * @returns Current permission status or 'default' if not supported
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) {
    return 'default';
  }
  return Notification.permission;
}

/**
 * Get emoji for a notification event type
 * @param eventType - Type of notification event
 * @returns Emoji string
 */
export function getEventEmoji(eventType?: NotificationEventType): string {
  if (!eventType) {
    return '🔔';
  }
  return EVENT_TYPE_EMOJIS[eventType] || '🔔';
}

/**
 * Push Notification Service implementation
 */
export class PushNotificationService implements IPushNotificationService {
  private config: PushNotificationConfig;
  private onClickCallback: (() => void) | null = null;

  /**
   * Create a new PushNotificationService instance
   * @param config - Optional initial configuration
   */
  constructor(config?: Partial<PushNotificationConfig>) {
    this.config = {
      enabled: config?.enabled ?? false,
      permission: config?.permission ?? getNotificationPermission(),
    };
  }

  /**
   * Set the configuration
   * @param config - Push notification configuration
   */
  setConfig(config: PushNotificationConfig): void {
    this.config = config;
  }

  /**
   * Get the current configuration
   * @returns Current configuration
   */
  getConfig(): PushNotificationConfig {
    return { ...this.config };
  }

  /**
   * Set a callback to be called when a notification is clicked
   * @param callback - Function to call on notification click
   */
  setOnClickCallback(callback: () => void): void {
    this.onClickCallback = callback;
  }

  /**
   * Check if the Notification API is supported in the current browser
   * @returns true if notifications are supported
   * @requirements 1.6
   */
  isSupported(): boolean {
    return isNotificationSupported();
  }

  /**
   * Get the current notification permission status
   * @returns Current permission status
   * @requirements 1.1
   */
  getPermissionStatus(): NotificationPermission {
    const permission = getNotificationPermission();
    this.config.permission = permission;
    return permission;
  }

  /**
   * Request notification permission from the user
   * @returns Promise resolving to the permission status
   * @requirements 1.1, 1.2, 1.6
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      return 'default';
    }

    // If already granted or denied, return current status
    const currentPermission = this.getPermissionStatus();
    if (currentPermission !== 'default') {
      return currentPermission;
    }

    try {
      const permission = await Notification.requestPermission();
      this.config.permission = permission;
      
      // If granted, enable notifications
      if (permission === 'granted') {
        this.config.enabled = true;
      }
      
      return permission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'default';
    }
  }

  /**
   * Show a browser notification
   * @param title - Notification title
   * @param options - Notification options
   * @returns Promise that resolves when notification is shown
   * @requirements 1.3, 1.4, 1.5
   */
  async showNotification(title: string, options?: NotificationOptions): Promise<void> {
    if (!this.isSupported()) {
      console.warn('Notifications are not supported in this browser');
      return;
    }

    if (!this.config.enabled) {
      console.warn('Notifications are disabled');
      return;
    }

    const permission = this.getPermissionStatus();
    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    // Merge default options with provided options
    const notificationOptions: NotificationOptions = {
      ...DEFAULT_NOTIFICATION_OPTIONS,
      ...options,
    };

    try {
      const notification = new Notification(title, notificationOptions);

      // Handle notification click - focus the window
      notification.onclick = () => {
        window.focus();
        notification.close();
        
        // Call custom callback if set
        if (this.onClickCallback) {
          this.onClickCallback();
        }
      };

      // Auto-close after 5 seconds if not requiring interaction
      if (!notificationOptions.requireInteraction) {
        setTimeout(() => {
          notification.close();
        }, 5000);
      }
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  /**
   * Show a notification for a specific event type
   * @param title - Notification title
   * @param message - Notification message
   * @param eventType - Type of event for icon/badge selection
   * @param data - Optional additional data
   * @returns Promise that resolves when notification is shown
   * @requirements 1.3, 1.4
   */
  async showEventNotification(
    title: string,
    message: string,
    eventType?: NotificationEventType,
    data?: Record<string, unknown>
  ): Promise<void> {
    const emoji = getEventEmoji(eventType);
    const formattedTitle = `${emoji} ${title}`;

    await this.showNotification(formattedTitle, {
      body: message,
      tag: eventType || 'general',
      data: data,
    });
  }

  /**
   * Show a test notification to verify configuration
   * @returns Promise that resolves when notification is shown
   */
  async showTestNotification(): Promise<void> {
    await this.showNotification('🔔 Test Notification', {
      body: 'This is a test notification from TwitchVote. If you see this, browser notifications are working correctly!',
      tag: 'test',
    });
  }

  /**
   * Check if notifications are currently enabled and permitted
   * @returns true if notifications can be shown
   */
  canShowNotifications(): boolean {
    return this.isSupported() && 
           this.config.enabled && 
           this.getPermissionStatus() === 'granted';
  }

  /**
   * Enable notifications (requires permission to be granted)
   * @returns true if notifications were enabled
   */
  enable(): boolean {
    if (this.getPermissionStatus() === 'granted') {
      this.config.enabled = true;
      return true;
    }
    return false;
  }

  /**
   * Disable notifications
   */
  disable(): void {
    this.config.enabled = false;
  }

  /**
   * Get instructions for enabling notifications manually
   * @returns Instructions string for the current browser
   * @requirements 1.6
   */
  getEnableInstructions(): string {
    return getPermissionInstructions();
  }
}

/**
 * Create a PushNotificationService instance with configuration
 * @param config - Optional push notification configuration
 * @returns Configured PushNotificationService instance
 */
export function createPushNotificationService(
  config?: Partial<PushNotificationConfig>
): PushNotificationService {
  return new PushNotificationService(config);
}
