/**
 * OverlaySyncMigration - Utilities for migrating from legacy to enhanced overlay sync
 * 
 * This module provides utilities to help components migrate from the legacy
 * useOverlaySync hook to the new enhanced version while maintaining backward
 * compatibility and providing a smooth transition path.
 */

import type { OverlayState, OverlayType } from '../../domain/entities/OverlayState';
import type { UseOverlaySyncOptions as LegacyOptions } from '../../../hooks/useOverlaySync';
import type { UseOverlaySyncOptions as EnhancedOptions } from '../../application/hooks/useOverlaySync';

/**
 * Legacy overlay state data format
 */
export interface LegacyOverlayStateData {
  currentPoll?: any;
  currentGiveaway?: any;
  currentGame?: any;
  currentPrediction?: any;
  theme?: string;
  mood?: 'hype' | 'calm' | 'toxic' | 'confused';
  lastUpdate?: number;
}

/**
 * Migration configuration
 */
export interface MigrationConfig {
  /** Enable gradual migration with feature flags */
  enableGradualMigration: boolean;
  
  /** Percentage of users to migrate (0-100) */
  migrationPercentage: number;
  
  /** Force migration for specific channel IDs */
  forceMigrationChannels: string[];
  
  /** Disable migration for specific channel IDs */
  disableMigrationChannels: string[];
  
  /** Enable migration logging */
  enableLogging: boolean;
}

/**
 * Default migration configuration
 */
const DEFAULT_MIGRATION_CONFIG: MigrationConfig = {
  enableGradualMigration: true,
  migrationPercentage: 50, // 50% rollout by default
  forceMigrationChannels: [],
  disableMigrationChannels: [],
  enableLogging: import.meta.env.DEV || false,
};

/**
 * Get migration configuration from environment and localStorage
 */
export function getMigrationConfig(): MigrationConfig {
  const envConfig: Partial<MigrationConfig> = {
    enableGradualMigration: import.meta.env.VITE_GRADUAL_MIGRATION !== 'false',
    migrationPercentage: parseInt(import.meta.env.VITE_MIGRATION_PERCENTAGE || '50', 10),
    enableLogging: import.meta.env.VITE_MIGRATION_LOGGING === 'true',
  };

  try {
    const storedConfig = localStorage.getItem('streamcrowd_migration_config');
    if (storedConfig) {
      const parsed = JSON.parse(storedConfig);
      return { ...DEFAULT_MIGRATION_CONFIG, ...envConfig, ...parsed };
    }
  } catch (error) {
    console.warn('[OverlaySyncMigration] Failed to parse migration config:', error);
  }

  return { ...DEFAULT_MIGRATION_CONFIG, ...envConfig };
}

/**
 * Determine if a channel should use the enhanced sync system
 */
export function shouldUseEnhancedSync(channelId?: string): boolean {
  const config = getMigrationConfig();
  
  if (!config.enableGradualMigration) {
    return false;
  }

  if (!channelId) {
    return false;
  }

  // Check force migration list
  if (config.forceMigrationChannels.includes(channelId)) {
    if (config.enableLogging) {
      console.log(`[OverlaySyncMigration] Force migrating channel: ${channelId}`);
    }
    return true;
  }

  // Check disable migration list
  if (config.disableMigrationChannels.includes(channelId)) {
    if (config.enableLogging) {
      console.log(`[OverlaySyncMigration] Migration disabled for channel: ${channelId}`);
    }
    return false;
  }

  // Use percentage-based rollout
  const hash = simpleHash(channelId);
  const shouldMigrate = (hash % 100) < config.migrationPercentage;
  
  if (config.enableLogging) {
    console.log(`[OverlaySyncMigration] Channel ${channelId} migration decision: ${shouldMigrate} (hash: ${hash}, percentage: ${config.migrationPercentage})`);
  }
  
  return shouldMigrate;
}

/**
 * Simple hash function for consistent percentage-based rollout
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Convert legacy options to enhanced options
 */
export function migrateLegacyOptions(
  legacyOptions?: LegacyOptions | string
): EnhancedOptions {
  if (typeof legacyOptions === 'string') {
    return {
      channelId: legacyOptions,
      enableMonitoring: true,
      autoReconnect: true,
      enableAuditLog: true,
      enableNetworkPrioritization: true,
    };
  }

  if (!legacyOptions) {
    return {
      enableMonitoring: true,
      autoReconnect: true,
      enableAuditLog: true,
      enableNetworkPrioritization: true,
    };
  }

  return {
    channelId: legacyOptions.channelId,
    enableMonitoring: legacyOptions.enableMonitoring ?? true,
    autoReconnect: legacyOptions.autoReconnect ?? true,
    debounceMs: legacyOptions.debounceMs,
    enableAuditLog: true,
    enableNetworkPrioritization: true,
    userContext: {
      userId: legacyOptions.channelId || 'unknown',
      sessionId: `session_${Date.now()}`,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
    },
  };
}

/**
 * Convert legacy state data to enhanced overlay state
 */
export function migrateLegacyStateData(
  legacyData: LegacyOverlayStateData,
  channelId: string,
  type: OverlayType = 'poll'
): OverlayState {
  const baseState: OverlayState = {
    id: `migrated_${channelId}_${type}_${Date.now()}`,
    type,
    channelId,
    isActive: true,
    updatedAt: legacyData.lastUpdate || Date.now(),
    data: {},
    metadata: {
      version: '2.0',
      source: 'legacy_migration',
      userId: channelId,
      migrated: true,
      originalFormat: 'legacy',
      timestamp: Date.now(),
    },
  };

  // Map legacy data to enhanced format based on type
  switch (type) {
    case 'poll':
      baseState.data = {
        question: legacyData.currentPoll?.question || '',
        options: legacyData.currentPoll?.options || [],
        totalVotes: legacyData.currentPoll?.totalVotes || 0,
        showResults: legacyData.currentPoll?.showResults || false,
        theme: legacyData.theme,
        mood: legacyData.mood,
      };
      break;

    case 'giveaway':
      baseState.data = {
        winner: legacyData.currentGiveaway?.winner || null,
        isSpinning: legacyData.currentGiveaway?.isSpinning || false,
        participants: legacyData.currentGiveaway?.participants || [],
        mode: legacyData.currentGiveaway?.mode || 'viewers',
        theme: legacyData.theme,
        mood: legacyData.mood,
      };
      break;

    case 'game':
      baseState.data = {
        gameType: legacyData.currentGame?.gameType || 'unknown',
        state: legacyData.currentGame?.state || {},
        players: legacyData.currentGame?.players || [],
        isActive: legacyData.currentGame?.isActive || false,
        theme: legacyData.theme,
        mood: legacyData.mood,
      };
      break;

    case 'prediction':
      baseState.data = {
        title: legacyData.currentPrediction?.title || '',
        outcomes: legacyData.currentPrediction?.outcomes || [],
        predictionWindow: legacyData.currentPrediction?.predictionWindow || 0,
        status: legacyData.currentPrediction?.status || 'ACTIVE',
        theme: legacyData.theme,
        mood: legacyData.mood,
      };
      break;

    default:
      // Generic data mapping for unknown types
      baseState.data = {
        ...legacyData,
        theme: legacyData.theme,
        mood: legacyData.mood,
      };
  }

  return baseState;
}

/**
 * Convert enhanced overlay state back to legacy format for backward compatibility
 */
export function convertToLegacyFormat(overlayState: OverlayState | null): LegacyOverlayStateData {
  if (!overlayState) {
    return {};
  }

  const legacyData: LegacyOverlayStateData = {
    theme: overlayState.data.theme,
    mood: overlayState.data.mood,
    lastUpdate: overlayState.updatedAt,
  };

  // Map enhanced data back to legacy format based on type
  switch (overlayState.type) {
    case 'poll':
      legacyData.currentPoll = {
        question: overlayState.data.question,
        options: overlayState.data.options,
        totalVotes: overlayState.data.totalVotes,
        showResults: overlayState.data.showResults,
      };
      break;

    case 'giveaway':
      legacyData.currentGiveaway = {
        winner: overlayState.data.winner,
        isSpinning: overlayState.data.isSpinning,
        participants: overlayState.data.participants,
        mode: overlayState.data.mode,
      };
      break;

    case 'game':
      legacyData.currentGame = {
        gameType: overlayState.data.gameType,
        state: overlayState.data.state,
        players: overlayState.data.players,
        isActive: overlayState.data.isActive,
      };
      break;

    case 'prediction':
      legacyData.currentPrediction = {
        title: overlayState.data.title,
        outcomes: overlayState.data.outcomes,
        predictionWindow: overlayState.data.predictionWindow,
        status: overlayState.data.status,
      };
      break;
  }

  return legacyData;
}

/**
 * Migration status tracking
 */
export interface MigrationStatus {
  channelId: string;
  migrationStarted: number;
  migrationCompleted?: number;
  legacyHookUsage: number;
  enhancedHookUsage: number;
  errors: string[];
  lastActivity: number;
}

/**
 * Track migration status for analytics and debugging
 */
export class MigrationTracker {
  private static instance: MigrationTracker | null = null;
  private statusMap = new Map<string, MigrationStatus>();
  private config = getMigrationConfig();

  static getInstance(): MigrationTracker {
    if (!MigrationTracker.instance) {
      MigrationTracker.instance = new MigrationTracker();
    }
    return MigrationTracker.instance;
  }

  /**
   * Record legacy hook usage
   */
  recordLegacyUsage(channelId: string): void {
    if (!this.config.enableLogging) return;

    const status = this.getOrCreateStatus(channelId);
    status.legacyHookUsage++;
    status.lastActivity = Date.now();
    
    if (this.config.enableLogging) {
      console.log(`[MigrationTracker] Legacy hook usage for ${channelId}: ${status.legacyHookUsage}`);
    }
  }

  /**
   * Record enhanced hook usage
   */
  recordEnhancedUsage(channelId: string): void {
    if (!this.config.enableLogging) return;

    const status = this.getOrCreateStatus(channelId);
    status.enhancedHookUsage++;
    status.lastActivity = Date.now();
    
    if (!status.migrationCompleted) {
      status.migrationCompleted = Date.now();
    }
    
    if (this.config.enableLogging) {
      console.log(`[MigrationTracker] Enhanced hook usage for ${channelId}: ${status.enhancedHookUsage}`);
    }
  }

  /**
   * Record migration error
   */
  recordError(channelId: string, error: string): void {
    const status = this.getOrCreateStatus(channelId);
    status.errors.push(`${Date.now()}: ${error}`);
    status.lastActivity = Date.now();
    
    if (this.config.enableLogging) {
      console.error(`[MigrationTracker] Error for ${channelId}: ${error}`);
    }
  }

  /**
   * Get migration status for a channel
   */
  getStatus(channelId: string): MigrationStatus | null {
    return this.statusMap.get(channelId) || null;
  }

  /**
   * Get all migration statuses
   */
  getAllStatuses(): MigrationStatus[] {
    return Array.from(this.statusMap.values());
  }

  /**
   * Get migration statistics
   */
  getStatistics(): {
    totalChannels: number;
    migratedChannels: number;
    legacyOnlyChannels: number;
    enhancedOnlyChannels: number;
    errorChannels: number;
    averageMigrationTime: number;
  } {
    const statuses = this.getAllStatuses();
    const migratedChannels = statuses.filter(s => s.migrationCompleted).length;
    const legacyOnlyChannels = statuses.filter(s => s.legacyHookUsage > 0 && s.enhancedHookUsage === 0).length;
    const enhancedOnlyChannels = statuses.filter(s => s.enhancedHookUsage > 0 && s.legacyHookUsage === 0).length;
    const errorChannels = statuses.filter(s => s.errors.length > 0).length;
    
    const migrationTimes = statuses
      .filter(s => s.migrationCompleted)
      .map(s => s.migrationCompleted! - s.migrationStarted);
    
    const averageMigrationTime = migrationTimes.length > 0 
      ? migrationTimes.reduce((sum, time) => sum + time, 0) / migrationTimes.length
      : 0;

    return {
      totalChannels: statuses.length,
      migratedChannels,
      legacyOnlyChannels,
      enhancedOnlyChannels,
      errorChannels,
      averageMigrationTime,
    };
  }

  private getOrCreateStatus(channelId: string): MigrationStatus {
    let status = this.statusMap.get(channelId);
    if (!status) {
      status = {
        channelId,
        migrationStarted: Date.now(),
        legacyHookUsage: 0,
        enhancedHookUsage: 0,
        errors: [],
        lastActivity: Date.now(),
      };
      this.statusMap.set(channelId, status);
    }
    return status;
  }
}

/**
 * Utility function to log migration events
 */
export function logMigrationEvent(
  event: 'legacy_hook_used' | 'enhanced_hook_used' | 'migration_error' | 'migration_completed',
  channelId: string,
  details?: any
): void {
  const tracker = MigrationTracker.getInstance();
  const config = getMigrationConfig();
  
  if (!config.enableLogging) return;

  switch (event) {
    case 'legacy_hook_used':
      tracker.recordLegacyUsage(channelId);
      break;
    case 'enhanced_hook_used':
      tracker.recordEnhancedUsage(channelId);
      break;
    case 'migration_error':
      tracker.recordError(channelId, details?.error || 'Unknown error');
      break;
    case 'migration_completed':
      console.log(`[OverlaySyncMigration] Migration completed for channel: ${channelId}`, details);
      break;
  }
}

// Export types
export type {
  LegacyOverlayStateData,
  MigrationConfig,
  MigrationStatus,
};