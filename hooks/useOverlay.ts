import { useState, useEffect, useCallback } from 'react';
import { getCurrentOverlayType } from '../config/overlayRegistry';

/**
 * Overlay settings configuration
 */
export interface OverlaySettings {
  bgColor: string;
  textColor: string;
  borderColor: string;
  showBorders: boolean;
  fontSize: 'small' | 'medium' | 'large';
  fontStyle: 'normal' | 'bold' | 'italic';
  theme: 'dark' | 'light';
}

/**
 * Return type for the useOverlay hook
 */
export interface UseOverlayReturn {
  // State
  isOverlayMode: boolean;
  settings: OverlaySettings;
  showSettings: boolean;
  
  // Actions
  setSettings: (settings: Partial<OverlaySettings>) => void;
  toggleSettings: () => void;
}

/**
 * Default overlay settings
 */
export const DEFAULT_OVERLAY_SETTINGS: OverlaySettings = {
  bgColor: 'transparent',
  textColor: '#FFFFFF',
  borderColor: '#FFFFFF',
  showBorders: true,
  fontSize: 'medium',
  fontStyle: 'bold',
  theme: 'dark',
};

/**
 * Detects if overlay mode is enabled via URL parameters
 * @returns true if any overlay parameter is present in URL params
 */
export function detectOverlayMode(): boolean {
  // Same registry as the OverlayRouter in App.tsx, so both always agree
  return getCurrentOverlayType() !== null;
}

/**
 * Extracts channel name from URL parameters
 * @returns channel name or null if not present
 */
export function getChannelFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('channel');
}

/**
 * Extracts poll configuration from URL parameters
 * @returns poll config or null if not present
 */
export function getPollConfigFromUrl(): { question: string; options: string[] } | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const pollQuestion = params.get('poll');
  const optionsParam = params.get('options');
  
  if (pollQuestion && optionsParam) {
    const optionLabels = optionsParam.split(',').map(o => o.trim()).filter(o => o);
    if (optionLabels.length >= 2) {
      return {
        question: decodeURIComponent(pollQuestion),
        options: optionLabels.map(o => decodeURIComponent(o)),
      };
    }
  }
  return null;
}

/**
 * A hook for managing overlay mode state and settings
 * 
 * Features:
 * - Detects overlay mode from URL parameters on mount
 * - Manages overlay visual settings (colors, fonts, borders)
 * - Persists settings for the session
 * - Provides toggle for settings panel visibility
 * 
 * @returns UseOverlayReturn with state and actions
 * 
 * @example
 * const { isOverlayMode, settings, setSettings, toggleSettings } = useOverlay();
 * 
 * if (isOverlayMode) {
 *   // Render overlay-specific UI
 * }
 * 
 * setSettings({ bgColor: '#FF0000' }); // Update specific settings
 */
export function useOverlay(): UseOverlayReturn {
  // Detect overlay mode from URL on initial render
  const [isOverlayMode, setIsOverlayMode] = useState<boolean>(() => detectOverlayMode());
  
  // Overlay settings state
  const [settings, setSettingsState] = useState<OverlaySettings>(DEFAULT_OVERLAY_SETTINGS);
  
  // Settings panel visibility
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Check URL params on mount and set overlay mode
  useEffect(() => {
    const isOverlay = detectOverlayMode();
    setIsOverlayMode(isOverlay);
  }, []);

  // Update settings partially (merge with existing)
  const setSettings = useCallback((newSettings: Partial<OverlaySettings>) => {
    setSettingsState(prev => ({
      ...prev,
      ...newSettings,
    }));
  }, []);

  // Toggle settings panel visibility
  const toggleSettings = useCallback(() => {
    setShowSettings(prev => !prev);
  }, []);

  return {
    isOverlayMode,
    settings,
    showSettings,
    setSettings,
    toggleSettings,
  };
}

export default useOverlay;
