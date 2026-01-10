/**
 * useTooltipPreference Hook
 * Manages global tooltip visibility preference
 */

import { useState, useCallback, useEffect } from 'react';

// ============================================
// TYPES
// ============================================

export interface TooltipPreference {
  enabled: boolean;
  delay: number; // ms before showing tooltip
}

export interface UseTooltipPreferenceReturn {
  preference: TooltipPreference;
  setEnabled: (enabled: boolean) => void;
  setDelay: (delay: number) => void;
  toggleEnabled: () => void;
}

// ============================================
// CONSTANTS
// ============================================

const STORAGE_KEY = 'tooltip_preference';
const DEFAULT_PREFERENCE: TooltipPreference = {
  enabled: true,
  delay: 500,
};

// ============================================
// HOOK
// ============================================

export function useTooltipPreference(): UseTooltipPreferenceReturn {
  const [preference, setPreference] = useState<TooltipPreference>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_PREFERENCE, ...JSON.parse(stored) };
      }
    } catch {
      // Ignore parse errors
    }
    return DEFAULT_PREFERENCE;
  });

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preference));
    } catch {
      // Ignore storage errors
    }
  }, [preference]);

  const setEnabled = useCallback((enabled: boolean) => {
    setPreference(prev => ({ ...prev, enabled }));
  }, []);

  const setDelay = useCallback((delay: number) => {
    setPreference(prev => ({ ...prev, delay: Math.max(0, delay) }));
  }, []);

  const toggleEnabled = useCallback(() => {
    setPreference(prev => ({ ...prev, enabled: !prev.enabled }));
  }, []);

  return {
    preference,
    setEnabled,
    setDelay,
    toggleEnabled,
  };
}

export default useTooltipPreference;
