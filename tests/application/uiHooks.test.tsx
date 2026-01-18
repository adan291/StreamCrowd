/**
 * UI Hooks Tests
 * 
 * Tests for Redux-based UI hooks (useTheme, useLanguage)
 * 
 * @requirements 6.1, 6.2, 9.3
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useTheme } from '@/src/application/hooks/useTheme';
import { useLanguage } from '@/src/application/hooks/useLanguage';
import uiReducer from '@/src/application/state/slices/uiSlice';
import React from 'react';

// Helper to create a test store
function createTestStore() {
  return configureStore({
    reducer: {
      ui: uiReducer,
    },
  });
}

// Helper to render hook with Redux provider
function renderHookWithRedux<T>(hook: () => T) {
  const store = createTestStore();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return renderHook(hook, { wrapper });
}

describe('useTheme', () => {
  beforeEach(() => {
    // Reset document classes
    document.documentElement.classList.remove('dark');
  });

  it('should return initial theme state', () => {
    const { result } = renderHookWithRedux(() => useTheme());

    expect(result.current.theme).toBe('dark');
    expect(result.current.isDark).toBe(true);
  });

  it('should toggle theme', () => {
    const { result } = renderHookWithRedux(() => useTheme());

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('light');
    expect(result.current.isDark).toBe(false);
  });

  it('should set theme', () => {
    const { result } = renderHookWithRedux(() => useTheme());

    act(() => {
      result.current.setTheme('light');
    });

    expect(result.current.theme).toBe('light');
    expect(result.current.isDark).toBe(false);
  });

  it('should apply dark class to document', () => {
    const { result } = renderHookWithRedux(() => useTheme());

    // Initial state should have dark class
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    act(() => {
      result.current.setTheme('light');
    });

    // After setting to light, dark class should be removed
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});

describe('useLanguage', () => {
  it('should return initial language state', () => {
    const { result } = renderHookWithRedux(() => useLanguage());

    expect(result.current.locale).toBe('es');
    expect(result.current.t).toBeDefined();
  });

  it('should set locale', () => {
    const { result } = renderHookWithRedux(() => useLanguage());

    act(() => {
      result.current.setLocale('en');
    });

    expect(result.current.locale).toBe('en');
  });

  it('should update translations when locale changes', () => {
    const { result } = renderHookWithRedux(() => useLanguage());

    const initialTranslations = result.current.t;

    act(() => {
      result.current.setLocale('en');
    });

    const newTranslations = result.current.t;

    // Translations object should be different
    expect(newTranslations).not.toBe(initialTranslations);
  });

  it('should update document language attribute', () => {
    const { result } = renderHookWithRedux(() => useLanguage());

    act(() => {
      result.current.setLocale('en');
    });

    expect(document.documentElement.lang).toBe('en');
  });
});

describe('useTheme and useLanguage integration', () => {
  it('should work together without conflicts', () => {
    const store = createTestStore();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );

    const { result: themeResult } = renderHook(() => useTheme(), { wrapper });
    const { result: langResult } = renderHook(() => useLanguage(), { wrapper });

    act(() => {
      themeResult.current.setTheme('light');
    });

    act(() => {
      langResult.current.setLocale('en');
    });

    expect(themeResult.current.theme).toBe('light');
    expect(langResult.current.locale).toBe('en');
  });
});
