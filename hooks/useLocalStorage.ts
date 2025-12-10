import { useState, useCallback, useEffect } from 'react';

/**
 * Options for customizing useLocalStorage behavior
 */
export interface UseLocalStorageOptions<T> {
  /** Custom serializer function (defaults to JSON.stringify) */
  serializer?: (value: T) => string;
  /** Custom deserializer function (defaults to JSON.parse) */
  deserializer?: (value: string) => T;
}

/**
 * A type-safe hook for persisting state to localStorage
 * 
 * Features:
 * - Generic type support
 * - Custom serializer/deserializer options
 * - Functional updates like useState
 * - Graceful error handling (returns initial value on parse errors)
 * - Immediate persistence on value changes
 * 
 * @param key - The localStorage key to use
 * @param initialValue - The initial value if no stored value exists
 * @param options - Optional serializer/deserializer configuration
 * @returns A tuple of [storedValue, setValue] similar to useState
 * 
 * @example
 * const [theme, setTheme] = useLocalStorage('theme', 'dark');
 * setTheme('light'); // Persists immediately
 * setTheme(prev => prev === 'dark' ? 'light' : 'dark'); // Functional update
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options?: UseLocalStorageOptions<T>
): [T, (value: T | ((prev: T) => T)) => void] {
  const serializer = options?.serializer ?? JSON.stringify;
  const deserializer = options?.deserializer ?? JSON.parse;

  // Initialize state with value from localStorage or initial value
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      if (item !== null) {
        return deserializer(item);
      }
      return initialValue;
    } catch (error) {
      // Log error but don't crash - return initial value
      console.warn(`useLocalStorage: Error reading key "${key}":`, error);
      return initialValue;
    }
  });

  // Setter function that persists to localStorage
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prevValue) => {
        // Handle functional updates
        const newValue = value instanceof Function ? value(prevValue) : value;

        // Persist to localStorage
        try {
          localStorage.setItem(key, serializer(newValue));
        } catch (error) {
          // Handle quota exceeded or other write errors gracefully
          console.warn(`useLocalStorage: Error writing key "${key}":`, error);
        }

        return newValue;
      });
    },
    [key, serializer]
  );

  return [storedValue, setValue];
}

export default useLocalStorage;
