/**
 * useActivityConfig Hook - Generic Configuration Management
 * Reusable configuration persistence for all activities (polls, predictions, games, giveaways)
 * Provides typed config state with automatic localStorage persistence
 */

import { useState, useCallback, useEffect, useRef } from 'react';

// ============================================
// TYPES
// ============================================

export interface UseActivityConfigOptions<T> {
  storageKey: string;
  defaultConfig: T;
  version?: number;
  onConfigChange?: (config: T) => void;
}

export interface UseActivityConfigReturn<T> {
  config: T;
  updateConfig: (updates: Partial<T>) => void;
  resetConfig: () => void;
  exportConfig: () => string;
  importConfig: (json: string) => boolean;
  isDefault: boolean;
}

interface StoredConfig<T> {
  version: number;
  config: T;
  updatedAt: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Deep equality check for objects
 */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (typeof a !== 'object') return a === b;
  
  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;
  
  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);
  
  if (aKeys.length !== bKeys.length) return false;
  
  return aKeys.every(key => deepEqual(aObj[key], bObj[key]));
}

/**
 * Validate config structure matches default
 */
export function validateConfigStructure<T extends object>(
  config: unknown,
  defaultConfig: T
): config is T {
  if (typeof config !== 'object' || config === null) return false;
  
  const configObj = config as Record<string, unknown>;
  const defaultObj = defaultConfig as Record<string, unknown>;
  
  // Check all required keys exist
  for (const key of Object.keys(defaultObj)) {
    if (!(key in configObj)) return false;
    
    // Type check for nested objects
    const defaultValue = defaultObj[key];
    const configValue = configObj[key];
    
    if (typeof defaultValue === 'object' && defaultValue !== null) {
      if (!validateConfigStructure(configValue, defaultValue as object)) {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Merge config with defaults (fills missing keys)
 */
export function mergeWithDefaults<T extends object>(
  config: Partial<T>,
  defaults: T
): T {
  const result = { ...defaults };
  
  for (const key of Object.keys(config) as (keyof T)[]) {
    const configValue = config[key];
    const defaultValue = defaults[key];
    
    if (configValue !== undefined) {
      if (
        typeof defaultValue === 'object' &&
        defaultValue !== null &&
        !Array.isArray(defaultValue) &&
        typeof configValue === 'object' &&
        configValue !== null &&
        !Array.isArray(configValue)
      ) {
        // Recursively merge nested objects
        result[key] = mergeWithDefaults(
          configValue as Partial<T[keyof T] & object>,
          defaultValue as T[keyof T] & object
        ) as T[keyof T];
      } else {
        result[key] = configValue as T[keyof T];
      }
    }
  }
  
  return result;
}

/**
 * Export config to JSON string
 */
export function exportConfigToJSON<T>(config: T, version: number): string {
  const stored: StoredConfig<T> = {
    version,
    config,
    updatedAt: new Date().toISOString(),
  };
  return JSON.stringify(stored, null, 2);
}

/**
 * Import config from JSON string
 */
export function importConfigFromJSON<T extends object>(
  json: string,
  defaultConfig: T,
  currentVersion: number
): T | null {
  try {
    const parsed = JSON.parse(json);
    
    // Handle raw config object
    if (!('version' in parsed) && !('config' in parsed)) {
      if (validateConfigStructure(parsed, defaultConfig)) {
        return mergeWithDefaults(parsed, defaultConfig);
      }
      return null;
    }
    
    // Handle stored config format
    const stored = parsed as StoredConfig<unknown>;
    
    // Version mismatch - use defaults for commands but keep user preferences
    if (stored.version !== currentVersion) {
      console.warn(
        `[useActivityConfig] Config version mismatch: expected ${currentVersion}, got ${stored.version}. Using updated defaults.`
      );
      // For major version changes, return defaults to get new commands
      // but preserve basic settings like enabled, prefix, cooldown
      const oldConfig = stored.config as Record<string, unknown>;
      const newConfig = { ...defaultConfig } as Record<string, unknown>;
      
      // Preserve user preferences but use new commands
      if ('enabled' in oldConfig) newConfig.enabled = oldConfig.enabled;
      if ('prefix' in oldConfig) newConfig.prefix = oldConfig.prefix;
      if ('globalCooldownMs' in oldConfig) newConfig.globalCooldownMs = oldConfig.globalCooldownMs;
      
      return newConfig as T;
    }
    
    if (validateConfigStructure(stored.config, defaultConfig)) {
      return mergeWithDefaults(stored.config as Partial<T>, defaultConfig);
    }
    
    return null;
  } catch {
    return null;
  }
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useActivityConfig<T extends object>(
  options: UseActivityConfigOptions<T>
): UseActivityConfigReturn<T> {
  const { storageKey, defaultConfig, version = 1, onConfigChange } = options;
  
  // Track if this is the initial mount
  const isInitialMount = useRef(true);
  
  // Load initial config from localStorage
  const [config, setConfig] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const imported = importConfigFromJSON(saved, defaultConfig, version);
        if (imported) return imported;
      }
    } catch {
      // Ignore localStorage errors
    }
    return defaultConfig;
  });

  // Persist config to localStorage on changes
  useEffect(() => {
    // Skip initial mount to avoid unnecessary writes
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    try {
      const json = exportConfigToJSON(config, version);
      localStorage.setItem(storageKey, json);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        console.warn('[useActivityConfig] localStorage quota exceeded');
      }
    }
    
    // Notify callback
    onConfigChange?.(config);
  }, [config, storageKey, version, onConfigChange]);

  // Update config (partial updates)
  const updateConfig = useCallback((updates: Partial<T>) => {
    setConfig(prev => mergeWithDefaults({ ...prev, ...updates }, defaultConfig));
  }, [defaultConfig]);

  // Reset to defaults
  const resetConfig = useCallback(() => {
    setConfig(defaultConfig);
  }, [defaultConfig]);

  // Export current config
  const exportConfig = useCallback(() => {
    return exportConfigToJSON(config, version);
  }, [config, version]);

  // Import config from JSON
  const importConfig = useCallback((json: string): boolean => {
    const imported = importConfigFromJSON(json, defaultConfig, version);
    if (imported) {
      setConfig(imported);
      return true;
    }
    return false;
  }, [defaultConfig, version]);

  // Check if config equals default
  const isDefault = deepEqual(config, defaultConfig);

  return {
    config,
    updateConfig,
    resetConfig,
    exportConfig,
    importConfig,
    isDefault,
  };
}

export default useActivityConfig;
