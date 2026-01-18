/**
 * useUI Hook (Redux-based)
 * 
 * Custom hook that encapsulates Redux logic for UI state.
 * Provides a clean API for components to interact with UI preferences.
 * 
 * @requirements 9.3
 */

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../state/hooks';
import {
  setTheme,
  toggleTheme,
  setLanguage,
  addNotification,
  dismissNotification,
  clearNotifications,
  toggleSidebar,
  setSidebarCollapsed,
  selectTheme,
  selectLanguage,
  selectNotifications,
  selectSidebarCollapsed,
  selectNotificationCount,
  selectNotificationsByType,
  selectRecentNotifications,
  type Notification,
} from '../state/slices/uiSlice';

export interface UseUIReturn {
  // State
  theme: 'light' | 'dark' | 'system';
  language: 'es' | 'en';
  notifications: Notification[];
  sidebarCollapsed: boolean;
  notificationCount: number;
  notificationsByType: Record<string, Notification[]>;
  recentNotifications: Notification[];

  // Actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleTheme: () => void;
  setLanguage: (language: 'es' | 'en') => void;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  dismissNotification: (id: string) => void;
  clearNotifications: () => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

/**
 * Custom hook for UI state management
 * 
 * Encapsulates Redux logic and provides a clean API for components.
 * 
 * @example
 * ```tsx
 * const { theme, setTheme, addNotification } = useUI();
 * 
 * // Change theme
 * setTheme('dark');
 * 
 * // Show notification
 * addNotification({
 *   type: 'success',
 *   message: 'Settings saved!',
 *   duration: 3000,
 * });
 * ```
 * 
 * @requirements 9.3 - Encapsulate Redux logic
 */
export function useUI(): UseUIReturn {
  const dispatch = useAppDispatch();

  // Select state using memoized selectors
  const theme = useAppSelector(selectTheme);
  const language = useAppSelector(selectLanguage);
  const notifications = useAppSelector(selectNotifications);
  const sidebarCollapsed = useAppSelector(selectSidebarCollapsed);
  const notificationCount = useAppSelector(selectNotificationCount);
  const notificationsByType = useAppSelector(selectNotificationsByType);
  const recentNotifications = useAppSelector(selectRecentNotifications);

  // Action creators wrapped in useCallback for stability
  const handleSetTheme = useCallback(
    (newTheme: 'light' | 'dark' | 'system') => {
      dispatch(setTheme(newTheme));
    },
    [dispatch]
  );

  const handleToggleTheme = useCallback(() => {
    dispatch(toggleTheme());
  }, [dispatch]);

  const handleSetLanguage = useCallback(
    (newLanguage: 'es' | 'en') => {
      dispatch(setLanguage(newLanguage));
    },
    [dispatch]
  );

  const handleAddNotification = useCallback(
    (notification: Omit<Notification, 'id' | 'createdAt'>) => {
      dispatch(addNotification(notification));
    },
    [dispatch]
  );

  const handleDismissNotification = useCallback(
    (id: string) => {
      dispatch(dismissNotification({ id }));
    },
    [dispatch]
  );

  const handleClearNotifications = useCallback(() => {
    dispatch(clearNotifications());
  }, [dispatch]);

  const handleToggleSidebar = useCallback(() => {
    dispatch(toggleSidebar());
  }, [dispatch]);

  const handleSetSidebarCollapsed = useCallback(
    (collapsed: boolean) => {
      dispatch(setSidebarCollapsed(collapsed));
    },
    [dispatch]
  );

  return {
    // State
    theme,
    language,
    notifications,
    sidebarCollapsed,
    notificationCount,
    notificationsByType,
    recentNotifications,

    // Actions
    setTheme: handleSetTheme,
    toggleTheme: handleToggleTheme,
    setLanguage: handleSetLanguage,
    addNotification: handleAddNotification,
    dismissNotification: handleDismissNotification,
    clearNotifications: handleClearNotifications,
    toggleSidebar: handleToggleSidebar,
    setSidebarCollapsed: handleSetSidebarCollapsed,
  };
}

export default useUI;
