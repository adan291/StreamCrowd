/**
 * UI and Connection Redux Integration Test
 * 
 * Verifies that UI and connection state are properly managed by Redux
 * and that no Context API is used for these features.
 * 
 * @requirements 10.1, 10.2 - Context API removal for application state
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { useUI } from '../../src/application/hooks/useUI';
import { useConnection } from '../../src/application/hooks/useConnection';
import uiReducer from '../../src/application/state/slices/uiSlice';
import connectionReducer from '../../src/application/state/slices/connectionSlice';

// Helper to create a test store
const createTestStore = () => {
  return configureStore({
    reducer: {
      ui: uiReducer,
      connection: connectionReducer,
    },
  });
};

// Helper to wrap hooks with Redux Provider
const createWrapper = (store: ReturnType<typeof createTestStore>) => {
  return ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
};

describe('UI and Connection Redux Integration', () => {
  describe('UI State Management', () => {
    let store: ReturnType<typeof createTestStore>;

    beforeEach(() => {
      store = createTestStore();
    });

    it('should manage theme state through Redux', () => {
      const { result } = renderHook(() => useUI(), {
        wrapper: createWrapper(store),
      });

      expect(result.current.theme).toBe('dark');

      act(() => {
        result.current.setTheme('light');
      });

      expect(result.current.theme).toBe('light');
    });

    it('should toggle theme correctly', () => {
      const { result } = renderHook(() => useUI(), {
        wrapper: createWrapper(store),
      });

      expect(result.current.theme).toBe('dark');

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe('light');

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe('dark');
    });

    it('should manage language state through Redux', () => {
      const { result } = renderHook(() => useUI(), {
        wrapper: createWrapper(store),
      });

      expect(result.current.language).toBe('es');

      act(() => {
        result.current.setLanguage('en');
      });

      expect(result.current.language).toBe('en');
    });

    it('should add and dismiss notifications', () => {
      const { result } = renderHook(() => useUI(), {
        wrapper: createWrapper(store),
      });

      expect(result.current.notifications).toHaveLength(0);

      act(() => {
        result.current.addNotification({
          type: 'success',
          message: 'Test notification',
        });
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].message).toBe('Test notification');
      expect(result.current.notifications[0].type).toBe('success');

      const notificationId = result.current.notifications[0].id;

      act(() => {
        result.current.dismissNotification(notificationId);
      });

      expect(result.current.notifications).toHaveLength(0);
    });

    it('should manage sidebar collapsed state', () => {
      const { result } = renderHook(() => useUI(), {
        wrapper: createWrapper(store),
      });

      expect(result.current.sidebarCollapsed).toBe(false);

      act(() => {
        result.current.toggleSidebar();
      });

      expect(result.current.sidebarCollapsed).toBe(true);

      act(() => {
        result.current.setSidebarCollapsed(false);
      });

      expect(result.current.sidebarCollapsed).toBe(false);
    });
  });

  describe('Connection State Management', () => {
    let store: ReturnType<typeof createTestStore>;

    beforeEach(() => {
      store = createTestStore();
    });

    it('should manage Twitch connection status through Redux', () => {
      const { result } = renderHook(() => useConnection(), {
        wrapper: createWrapper(store),
      });

      expect(result.current.twitchStatus.connected).toBe(false);

      act(() => {
        result.current.setTwitchStatus(true);
      });

      expect(result.current.twitchStatus.connected).toBe(true);
      expect(result.current.twitchStatus.lastConnected).toBeTruthy();
    });

    it('should manage OBS connection status through Redux', () => {
      const { result } = renderHook(() => useConnection(), {
        wrapper: createWrapper(store),
      });

      expect(result.current.obsStatus.connected).toBe(false);

      act(() => {
        result.current.setOBSStatus(true);
      });

      expect(result.current.obsStatus.connected).toBe(true);
      expect(result.current.obsStatus.lastConnected).toBeTruthy();
    });

    it('should manage Firebase connection status through Redux', () => {
      const { result } = renderHook(() => useConnection(), {
        wrapper: createWrapper(store),
      });

      expect(result.current.firebaseStatus.connected).toBe(false);

      act(() => {
        result.current.setFirebaseStatus(true);
      });

      expect(result.current.firebaseStatus.connected).toBe(true);
      expect(result.current.firebaseStatus.lastConnected).toBeTruthy();
    });

    it('should store connection errors', () => {
      const { result } = renderHook(() => useConnection(), {
        wrapper: createWrapper(store),
      });

      act(() => {
        result.current.setTwitchStatus(false, 'Connection failed');
      });

      expect(result.current.twitchStatus.error).toBe('Connection failed');
      expect(result.current.hasConnectionErrors).toBe(true);
    });

    it('should clear connection errors', () => {
      const { result } = renderHook(() => useConnection(), {
        wrapper: createWrapper(store),
      });

      act(() => {
        result.current.setTwitchStatus(false, 'Connection failed');
      });

      expect(result.current.twitchStatus.error).toBe('Connection failed');

      act(() => {
        result.current.clearConnectionError('twitch');
      });

      expect(result.current.twitchStatus.error).toBeNull();
    });

    it('should count connected services', () => {
      const { result } = renderHook(() => useConnection(), {
        wrapper: createWrapper(store),
      });

      expect(result.current.connectedServicesCount).toBe(0);

      act(() => {
        result.current.setTwitchStatus(true);
      });

      expect(result.current.connectedServicesCount).toBe(1);

      act(() => {
        result.current.setOBSStatus(true);
      });

      expect(result.current.connectedServicesCount).toBe(2);

      act(() => {
        result.current.setFirebaseStatus(true);
      });

      expect(result.current.connectedServicesCount).toBe(3);
    });

    it('should reset all connections', () => {
      const { result } = renderHook(() => useConnection(), {
        wrapper: createWrapper(store),
      });

      act(() => {
        result.current.setTwitchStatus(true);
        result.current.setOBSStatus(true);
        result.current.setFirebaseStatus(true);
      });

      expect(result.current.connectedServicesCount).toBe(3);

      act(() => {
        result.current.resetConnections();
      });

      expect(result.current.connectedServicesCount).toBe(0);
      expect(result.current.twitchStatus.connected).toBe(false);
      expect(result.current.obsStatus.connected).toBe(false);
      expect(result.current.firebaseStatus.connected).toBe(false);
    });
  });

  describe('Context API Removal Verification', () => {
    it('should not use UIContext for UI state', () => {
      const store = createTestStore();
      const { result } = renderHook(() => useUI(), {
        wrapper: createWrapper(store),
      });

      // If this test passes, it means useUI is working with Redux
      // and not throwing an error about missing UIContext
      expect(result.current).toBeDefined();
      expect(result.current.theme).toBeDefined();
      expect(result.current.language).toBeDefined();
    });

    it('should not use ConnectionContext for connection state', () => {
      const store = createTestStore();
      const { result } = renderHook(() => useConnection(), {
        wrapper: createWrapper(store),
      });

      // If this test passes, it means useConnection is working with Redux
      // and not throwing an error about missing ConnectionContext
      expect(result.current).toBeDefined();
      expect(result.current.twitchStatus).toBeDefined();
      expect(result.current.obsStatus).toBeDefined();
      expect(result.current.firebaseStatus).toBeDefined();
    });
  });
});
