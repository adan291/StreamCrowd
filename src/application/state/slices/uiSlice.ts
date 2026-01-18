/**
 * UI Slice
 * 
 * Redux slice for UI state management.
 * Handles theme, language, notifications, and UI preferences.
 * 
 * @requirements 6.1, 6.2, 6.3, 6.4, 6.5
 */

import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../store';

// Types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  createdAt: string;
  duration?: number;
}

export interface UIState {
  theme: 'light' | 'dark' | 'system';
  language: 'es' | 'en';
  notifications: Notification[];
  sidebarCollapsed: boolean;
}

// Initial state
const initialState: UIState = {
  theme: 'dark',
  language: 'es',
  notifications: [],
  sidebarCollapsed: false,
};

// Slice
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    /**
     * Set theme
     * @requirements 6.1 - Update theme and persist preference
     */
    setTheme: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {
      state.theme = action.payload;
    },

    /**
     * Toggle theme between light and dark
     */
    toggleTheme: (state) => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
    },

    /**
     * Set language
     * @requirements 6.2 - Update language and persist preference
     */
    setLanguage: (state, action: PayloadAction<'es' | 'en'>) => {
      state.language = action.payload;
    },

    /**
     * Add notification
     * @requirements 6.3 - Add notification to array
     */
    addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'createdAt'>>) => {
      state.notifications.push({
        ...action.payload,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
      });
    },

    /**
     * Dismiss notification
     * @requirements 6.4 - Remove notification from array
     */
    dismissNotification: (state, action: PayloadAction<{ id: string }>) => {
      state.notifications = state.notifications.filter(n => n.id !== action.payload.id);
    },

    /**
     * Clear all notifications
     */
    clearNotifications: (state) => {
      state.notifications = [];
    },

    /**
     * Toggle sidebar collapsed state
     */
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },

    /**
     * Set sidebar collapsed state
     */
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },
  },
});

// Actions
export const {
  setTheme,
  toggleTheme,
  setLanguage,
  addNotification,
  dismissNotification,
  clearNotifications,
  toggleSidebar,
  setSidebarCollapsed,
} = uiSlice.actions;

// Selectors
/**
 * Select theme
 */
export const selectTheme = (state: RootState) => state.ui.theme;

/**
 * Select language
 */
export const selectLanguage = (state: RootState) => state.ui.language;

/**
 * Select notifications
 */
export const selectNotifications = (state: RootState) => state.ui.notifications;

/**
 * Select sidebar collapsed state
 */
export const selectSidebarCollapsed = (state: RootState) => state.ui.sidebarCollapsed;

/**
 * Memoized selector for notification count
 */
export const selectNotificationCount = createSelector(
  [selectNotifications],
  (notifications) => notifications.length
);

/**
 * Memoized selector for notifications by type
 */
export const selectNotificationsByType = createSelector(
  [selectNotifications],
  (notifications) => {
    const byType: Record<string, Notification[]> = {
      success: [],
      error: [],
      info: [],
      warning: [],
    };
    
    notifications.forEach(n => {
      if (byType[n.type]) {
        byType[n.type].push(n);
      }
    });
    
    return byType;
  }
);

/**
 * Memoized selector for recent notifications (last 5)
 */
export const selectRecentNotifications = createSelector(
  [selectNotifications],
  (notifications) => notifications.slice(-5)
);

// Reducer
export default uiSlice.reducer;
