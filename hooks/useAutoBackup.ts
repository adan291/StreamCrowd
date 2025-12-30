/**
 * useAutoBackup - Auto-backup on Configuration Changes Hook
 * 
 * Monitors localStorage for configuration changes and triggers
 * automatic backup with debouncing.
 * 
 * Features:
 * - Detects changes in commands, timers, presets, AI config, moderation settings
 * - Debounces backup to 5 minutes after last change
 * - Multiple changes within window result in single backup
 * 
 * @requirements 3.3 - Auto-backup within 5 minutes of modification
 */

import { useEffect, useRef, useCallback } from 'react';
import { useBackupService } from './useBackupService';
import { AUTO_BACKUP_DELAY_MS } from '../types/backup';

// ============================================
// STORAGE KEYS TO MONITOR
// ============================================

/**
 * localStorage keys that should trigger auto-backup when changed
 */
const MONITORED_STORAGE_KEYS = [
  'twitchvote_commands',
  'twitchvote_timers',
  'twitchvote_timer_groups',
  'twitch_vote_mod_presets',
  'twitchvote_ai_config',
  'twitchvote_moderation_config',
  'twitchvote_custom_sounds',
] as const;

// ============================================
// HOOK OPTIONS
// ============================================

export interface UseAutoBackupOptions {
  /** Whether auto-backup is enabled (default: true if backup service is connected) */
  enabled?: boolean;
  /** Delay in ms before triggering backup (default: 5 minutes) */
  delayMs?: number;
  /** Callback when backup is triggered */
  onBackupTriggered?: () => void;
  /** Callback when backup completes */
  onBackupComplete?: (success: boolean) => void;
}

// ============================================
// HOOK RETURN TYPE
// ============================================

export interface UseAutoBackupReturn {
  /** Whether auto-backup is currently enabled */
  isEnabled: boolean;
  /** Whether a backup is scheduled */
  isScheduled: boolean;
  /** Timestamp when next backup will occur (if scheduled) */
  scheduledAt: number | null;
  /** Manually trigger a backup */
  triggerBackup: () => void;
  /** Cancel any scheduled backup */
  cancelScheduled: () => void;
}

// ============================================
// MAIN HOOK
// ============================================

export function useAutoBackup(options: UseAutoBackupOptions = {}): UseAutoBackupReturn {
  const {
    enabled = true,
    delayMs = AUTO_BACKUP_DELAY_MS,
    onBackupTriggered,
    onBackupComplete,
  } = options;

  const { config, backup, scheduleBackup, cancelScheduledBackup } = useBackupService();
  
  const scheduledAtRef = useRef<number | null>(null);
  const previousValuesRef = useRef<Map<string, string>>(new Map());
  const isInitializedRef = useRef(false);

  // Check if auto-backup should be active
  const isAutoBackupActive = enabled && config.provider !== null && config.autoBackupEnabled;

  /**
   * Initialize previous values on mount
   */
  useEffect(() => {
    if (!isInitializedRef.current) {
      for (const key of MONITORED_STORAGE_KEYS) {
        const value = localStorage.getItem(key);
        if (value) {
          previousValuesRef.current.set(key, value);
        }
      }
      isInitializedRef.current = true;
    }
  }, []);

  /**
   * Check if a storage key has changed
   */
  const hasKeyChanged = useCallback((key: string): boolean => {
    const currentValue = localStorage.getItem(key);
    const previousValue = previousValuesRef.current.get(key);
    
    // Update previous value
    if (currentValue) {
      previousValuesRef.current.set(key, currentValue);
    } else {
      previousValuesRef.current.delete(key);
    }
    
    return currentValue !== previousValue;
  }, []);

  /**
   * Handle storage change event
   */
  const handleStorageChange = useCallback((event: StorageEvent) => {
    // Only process if auto-backup is active
    if (!isAutoBackupActive) return;
    
    // Check if the changed key is one we monitor
    if (event.key && MONITORED_STORAGE_KEYS.includes(event.key as any)) {
      // Schedule backup
      scheduledAtRef.current = Date.now() + delayMs;
      scheduleBackup(delayMs);
      onBackupTriggered?.();
    }
  }, [isAutoBackupActive, delayMs, scheduleBackup, onBackupTriggered]);

  /**
   * Poll for changes (fallback for same-tab changes)
   * Storage events only fire for changes from other tabs
   */
  useEffect(() => {
    if (!isAutoBackupActive) return;

    const checkForChanges = () => {
      let hasChanges = false;
      
      for (const key of MONITORED_STORAGE_KEYS) {
        if (hasKeyChanged(key)) {
          hasChanges = true;
          break;
        }
      }
      
      if (hasChanges) {
        scheduledAtRef.current = Date.now() + delayMs;
        scheduleBackup(delayMs);
        onBackupTriggered?.();
      }
    };

    // Check every 30 seconds
    const intervalId = setInterval(checkForChanges, 30000);
    
    return () => clearInterval(intervalId);
  }, [isAutoBackupActive, delayMs, hasKeyChanged, scheduleBackup, onBackupTriggered]);

  /**
   * Listen for storage events (cross-tab changes)
   */
  useEffect(() => {
    if (!isAutoBackupActive) return;

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [isAutoBackupActive, handleStorageChange]);

  /**
   * Manually trigger a backup
   */
  const triggerBackup = useCallback(async () => {
    const result = await backup();
    onBackupComplete?.(result.success);
  }, [backup, onBackupComplete]);

  /**
   * Cancel any scheduled backup
   */
  const cancelScheduled = useCallback(() => {
    cancelScheduledBackup();
    scheduledAtRef.current = null;
  }, [cancelScheduledBackup]);

  return {
    isEnabled: isAutoBackupActive,
    isScheduled: scheduledAtRef.current !== null,
    scheduledAt: scheduledAtRef.current,
    triggerBackup,
    cancelScheduled,
  };
}

export default useAutoBackup;
