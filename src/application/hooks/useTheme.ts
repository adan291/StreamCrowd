/**
 * useTheme Hook (Redux-based)
 * 
 * Custom hook that wraps useUI to provide theme-specific functionality.
 * Provides backward compatibility with the old ThemeContext API.
 * 
 * @requirements 6.1, 9.3
 */

import { useCallback, useEffect } from 'react';
import { useUI } from './useUI';

export type Theme = 'light' | 'dark' | 'system';

export interface UseThemeReturn {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

/**
 * Custom hook for theme management using Redux
 * 
 * Provides backward compatibility with the old ThemeContext API
 * while using Redux under the hood.
 * 
 * @example
 * ```tsx
 * const { theme, toggleTheme, isDark } = useTheme();
 * 
 * // Toggle theme
 * toggleTheme();
 * 
 * // Check if dark mode
 * if (isDark) {
 *   console.log('Dark mode is active');
 * }
 * ```
 * 
 * @requirements 6.1 - Theme management
 * @requirements 9.3 - Encapsulate Redux logic
 */
export function useTheme(): UseThemeReturn {
  const { theme, setTheme, toggleTheme } = useUI();

  // Apply theme to document
  useEffect(() => {
    if (theme === 'dark' || theme === 'system') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Listen for system theme changes when theme is 'system'
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  return {
    theme,
    setTheme,
    toggleTheme,
    isDark,
  };
}

export default useTheme;
