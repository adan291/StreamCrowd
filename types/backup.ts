/**
 * Backup Types for Cloud Backup System
 * 
 * Defines types for the automatic cloud backup service that syncs
 * configuration data to Google Drive or custom servers.
 * 
 * @requirements 3.1, 3.4 - Cloud storage connection and data backup
 */

import type { ModerationConfig } from '../src/domain/entities/ModerationConfig';
import type { Timer, TimerGroup } from './timers';

// ============================================
// CLOUD PROVIDER TYPES
// ============================================

/**
 * Supported cloud storage providers
 * @requirements 3.1 - Google Drive or custom server
 */
export type CloudProvider = 'google-drive' | 'custom-server';

/**
 * Sync status for backup operations
 * @requirements 3.7 - Backup status indicator
 */
export type BackupSyncStatus = 'synced' | 'syncing' | 'error' | 'pending' | 'disconnected';

// ============================================
// CREDENTIALS TYPES
// ============================================

/**
 * Google Drive OAuth credentials
 */
export interface GoogleDriveCredentials {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scope: string;
}

/**
 * Custom server credentials
 */
export interface CustomServerCredentials {
  serverUrl: string;
  apiKey: string;
}

/**
 * Union type for all credential types
 */
export type BackupCredentials = GoogleDriveCredentials | CustomServerCredentials;

// ============================================
// CONFIGURATION TYPES
// ============================================

/**
 * Backup service configuration
 * @requirements 3.1, 3.3 - Cloud storage connection and auto-backup
 */
export interface BackupConfig {
  /** Selected cloud provider */
  provider: CloudProvider | null;
  /** Provider-specific credentials (encrypted in storage) */
  credentials: BackupCredentials | null;
  /** Whether auto-backup is enabled */
  autoBackupEnabled: boolean;
  /** Timestamp of last successful backup */
  lastBackupAt: number | null;
  /** Current sync status */
  lastSyncStatus: BackupSyncStatus;
  /** Last error message if status is 'error' */
  lastError: string | null;
  /** Number of retry attempts for current operation */
  retryCount: number;
}

// ============================================
// BACKUP DATA TYPES
// ============================================

/**
 * Custom command data for backup
 */
export interface BackupCommand {
  id: string;
  name: string;
  response: string;
  cooldown: number;
  userLevel: 'everyone' | 'subscriber' | 'vip' | 'moderator' | 'broadcaster';
  enabled: boolean;
  aliases?: string[];
  description?: string;
  categoryId?: string;
  createdBy?: 'manual' | 'template' | 'ai' | 'imported';
  usageCount: number;
}

/**
 * Preset configuration for backup
 */
export interface BackupPreset {
  id: string;
  name: string;
  config: ModerationConfig;
  createdAt: number;
}

/**
 * AI configuration for backup
 */
export interface BackupAIConfig {
  enabled: boolean;
  provider?: string;
  apiKey?: string; // Will be encrypted
  model?: string;
  temperature?: number;
  maxTokens?: number;
  customPrompt?: string;
}

/**
 * Custom sound for backup
 */
export interface BackupSound {
  id: string;
  name: string;
  data: string; // Base64 encoded audio
  volume: number;
  category?: string;
}

/**
 * Timer group for backup
 */
export interface BackupTimerGroup {
  id: string;
  name: string;
  color: string;
  enabled: boolean;
}

/**
 * Complete backup data structure
 * @requirements 3.4 - Backup commands, timers, presets, AI config, moderation settings, custom sounds
 */
export interface BackupData {
  /** Backup format version for migrations */
  version: number;
  /** Timestamp when backup was created */
  timestamp: number;
  /** Application identifier */
  application: 'streamcrowd';
  /** Backed up data */
  data: {
    /** Custom chat commands */
    commands: BackupCommand[];
    /** Chat timers */
    timers: Timer[];
    /** Timer groups */
    timerGroups: BackupTimerGroup[];
    /** Moderation presets */
    presets: BackupPreset[];
    /** AI configuration */
    aiConfig: BackupAIConfig | null;
    /** Moderation settings */
    moderationSettings: ModerationConfig | null;
    /** Custom sounds */
    customSounds: BackupSound[];
  };
  /** Checksum for data integrity verification */
  checksum: string;
}

// ============================================
// OPERATION TYPES
// ============================================

/**
 * Result of a backup operation
 */
export interface BackupResult {
  success: boolean;
  timestamp: number;
  error?: string;
  bytesUploaded?: number;
}

/**
 * Result of a restore operation
 * @requirements 3.5 - Restore from cloud backup
 */
export interface RestoreResult {
  success: boolean;
  timestamp: number;
  error?: string;
  restoredItems: {
    commands: number;
    timers: number;
    timerGroups: number;
    presets: number;
    aiConfig: boolean;
    moderationSettings: boolean;
    customSounds: number;
  };
}

/**
 * Retry configuration for failed operations
 * @requirements 3.6 - Retry up to 3 times with exponential backoff
 */
export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

// ============================================
// STORAGE TYPES
// ============================================

/**
 * Storage schema for backup configuration in localStorage
 */
export interface BackupStorage {
  /** Schema version for migrations */
  version: 1;
  /** Backup configuration */
  config: BackupConfig;
  /** Scheduled backup timestamp (if pending) */
  scheduledBackupAt: number | null;
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Current backup data format version
 */
export const BACKUP_DATA_VERSION = 1;

/**
 * localStorage key for backup configuration
 */
export const BACKUP_STORAGE_KEY = 'streamcrowd_backup_config';

/**
 * Auto-backup debounce delay in milliseconds (5 minutes)
 * @requirements 3.3 - Backup within 5 minutes of modification
 */
export const AUTO_BACKUP_DELAY_MS = 5 * 60 * 1000;

/**
 * Default retry configuration
 * @requirements 3.6 - Retry up to 3 times with exponential backoff
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,  // 1 second
  maxDelayMs: 8000,   // 8 seconds max
};

/**
 * Default backup configuration
 */
export const DEFAULT_BACKUP_CONFIG: BackupConfig = {
  provider: null,
  credentials: null,
  autoBackupEnabled: false,
  lastBackupAt: null,
  lastSyncStatus: 'disconnected',
  lastError: null,
  retryCount: 0,
};

/**
 * Default backup storage
 */
export const DEFAULT_BACKUP_STORAGE: BackupStorage = {
  version: 1,
  config: DEFAULT_BACKUP_CONFIG,
  scheduledBackupAt: null,
};

// ============================================
// TYPE GUARDS
// ============================================

/**
 * Type guard for GoogleDriveCredentials
 */
export function isGoogleDriveCredentials(
  credentials: BackupCredentials | null
): credentials is GoogleDriveCredentials {
  if (!credentials) return false;
  return 'accessToken' in credentials && 'refreshToken' in credentials;
}

/**
 * Type guard for CustomServerCredentials
 */
export function isCustomServerCredentials(
  credentials: BackupCredentials | null
): credentials is CustomServerCredentials {
  if (!credentials) return false;
  return 'serverUrl' in credentials && 'apiKey' in credentials;
}

/**
 * Type guard for valid BackupData
 */
export function isValidBackupData(obj: unknown): obj is BackupData {
  if (typeof obj !== 'object' || obj === null) return false;
  
  const data = obj as Record<string, unknown>;
  
  return (
    typeof data.version === 'number' &&
    typeof data.timestamp === 'number' &&
    data.application === 'streamcrowd' &&
    typeof data.data === 'object' &&
    data.data !== null &&
    typeof data.checksum === 'string'
  );
}

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Input for connecting to a cloud provider
 */
export interface ConnectProviderInput {
  provider: CloudProvider;
  credentials: BackupCredentials;
}

/**
 * Sensitive fields that need encryption
 * @requirements 3.9 - Encrypt sensitive data (API keys)
 */
export const SENSITIVE_FIELDS = [
  'accessToken',
  'refreshToken', 
  'apiKey',
] as const;

export type SensitiveField = typeof SENSITIVE_FIELDS[number];
