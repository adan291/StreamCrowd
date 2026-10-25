/**
 * useBackupService - Cloud Backup Service Hook
 * 
 * Provides automatic and manual backup/restore functionality
 * for user configuration data to cloud storage providers.
 * 
 * Features:
 * - Connect to Google Drive or custom server
 * - Manual and automatic backup
 * - Restore from cloud backup
 * - Retry with exponential backoff
 * - Encryption of sensitive data
 * 
 * @requirements 3.1, 3.2, 3.3, 3.5, 3.6, 3.8
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  BackupConfig,
  BackupData,
  BackupStorage,
  BackupResult,
  RestoreResult,
  CloudProvider,
  BackupCredentials,
  BackupSyncStatus,
  ConnectProviderInput,
  BACKUP_STORAGE_KEY,
  BACKUP_DATA_VERSION,
  AUTO_BACKUP_DELAY_MS,
  DEFAULT_BACKUP_CONFIG,
  DEFAULT_BACKUP_STORAGE,
  DEFAULT_RETRY_CONFIG,
  isGoogleDriveCredentials,
  isCustomServerCredentials,
} from '../types/backup';
import {
  encryptSensitiveData,
  decryptSensitiveData,
  encryptFields,
  decryptFields,
  generateChecksum,
  verifyChecksum,
} from '../src/application/utils/encryption';

// ============================================
// STORAGE UTILITIES
// ============================================

/**
 * Load backup config from localStorage
 */
function loadBackupConfig(): BackupStorage {
  try {
    const stored = localStorage.getItem(BACKUP_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as BackupStorage;
      if (parsed.version === 1 && parsed.config) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn('useBackupService: Error loading config from storage:', error);
  }
  return { ...DEFAULT_BACKUP_STORAGE };
}

/**
 * Save backup config to localStorage
 */
function saveBackupConfig(storage: BackupStorage): void {
  try {
    localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(storage));
  } catch (error) {
    console.warn('useBackupService: Error saving config to storage:', error);
  }
}

// ============================================
// CLOUD PROVIDER IMPLEMENTATIONS
// ============================================

/**
 * Google Drive API wrapper
 */
const googleDriveApi = {
  /**
   * Upload backup data to Google Drive
   */
  async upload(data: string, accessToken: string): Promise<{ success: boolean; error?: string }> {
    try {
      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const metadata = {
        name: 'twitchvote-backup.json',
        mimeType: 'application/json',
        parents: ['appDataFolder'],
      };

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        data +
        closeDelimiter;

      // First, check if file exists
      const searchResponse = await fetch(
        'https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name%3D%27twitchvote-backup.json%27',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!searchResponse.ok) {
        return { success: false, error: `Search failed: ${searchResponse.statusText}` };
      }

      const searchResult = await searchResponse.json();
      const existingFileId = searchResult.files?.[0]?.id;

      let response: Response;
      if (existingFileId) {
        // Update existing file
        response = await fetch(
          `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: data,
          }
        );
      } else {
        // Create new file
        response = await fetch(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': `multipart/related; boundary=${boundary}`,
            },
            body: multipartRequestBody,
          }
        );
      }

      if (!response.ok) {
        return { success: false, error: `Upload failed: ${response.statusText}` };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Download backup data from Google Drive
   */
  async download(accessToken: string): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
      // Search for backup file
      const searchResponse = await fetch(
        'https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name%3D%27twitchvote-backup.json%27',
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!searchResponse.ok) {
        return { success: false, error: `Search failed: ${searchResponse.statusText}` };
      }

      const searchResult = await searchResponse.json();
      const fileId = searchResult.files?.[0]?.id;

      if (!fileId) {
        return { success: false, error: 'No backup found' };
      }

      // Download file content
      const downloadResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (!downloadResponse.ok) {
        return { success: false, error: `Download failed: ${downloadResponse.statusText}` };
      }

      const data = await downloadResponse.text();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
};

/**
 * Custom server API wrapper
 */
const customServerApi = {
  /**
   * Upload backup data to custom server
   */
  async upload(
    data: string,
    serverUrl: string,
    apiKey: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${serverUrl}/backup`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: data,
      });

      if (!response.ok) {
        return { success: false, error: `Upload failed: ${response.statusText}` };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  /**
   * Download backup data from custom server
   */
  async download(
    serverUrl: string,
    apiKey: string
  ): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
      const response = await fetch(`${serverUrl}/backup`, {
        method: 'GET',
        headers: {
          'X-API-Key': apiKey,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return { success: false, error: 'No backup found' };
        }
        return { success: false, error: `Download failed: ${response.statusText}` };
      }

      const data = await response.text();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
};

// ============================================
// DATA COLLECTION UTILITIES
// ============================================

/**
 * Reads a JSON value from localStorage. A corrupted or unreadable key returns
 * the fallback instead of aborting the whole backup.
 */
function readStoredJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    console.warn(`[Backup] Skipping unreadable key: ${key}`);
    return fallback;
  }
}

/**
 * Collect all data that needs to be backed up
 * @requirements 3.4 - Backup commands, timers, presets, AI config, moderation settings, custom sounds
 */
async function collectBackupData(): Promise<BackupData['data']> {
  // Collect commands
  const commands = readStoredJson<BackupData['data']['commands']>('twitchvote_commands', []);

  // Collect timers
  const timers = readStoredJson<BackupData['data']['timers']>('twitchvote_timers', []);

  // Collect timer groups
  const timerGroups = readStoredJson<BackupData['data']['timerGroups']>('twitchvote_timer_groups', []);

  // Collect presets
  const presets = readStoredJson<BackupData['data']['presets']>('twitch_vote_mod_presets', []);

  // Collect AI config
  let aiConfig = readStoredJson<BackupData['data']['aiConfig']>('twitchvote_ai_config', null);
  
  // Encrypt sensitive AI config fields
  if (aiConfig && aiConfig.apiKey) {
    aiConfig = (await encryptFields(
      aiConfig as unknown as Record<string, unknown>,
      ['apiKey']
    )) as unknown as BackupData['data']['aiConfig'];
  }

  // Collect moderation settings
  const moderationSettings = readStoredJson<BackupData['data']['moderationSettings']>('twitchvote_moderation_config', null);

  // Collect custom sounds
  const customSounds = readStoredJson<BackupData['data']['customSounds']>('twitchvote_custom_sounds', []);

  return {
    commands,
    timers,
    timerGroups,
    presets,
    aiConfig,
    moderationSettings,
    customSounds,
  };
}

/**
 * Restore data from backup
 */
async function restoreBackupData(data: BackupData['data']): Promise<RestoreResult['restoredItems']> {
  const restoredItems: RestoreResult['restoredItems'] = {
    commands: 0,
    timers: 0,
    timerGroups: 0,
    presets: 0,
    aiConfig: false,
    moderationSettings: false,
    customSounds: 0,
  };

  // Restore commands
  if (data.commands && data.commands.length > 0) {
    localStorage.setItem('twitchvote_commands', JSON.stringify(data.commands));
    restoredItems.commands = data.commands.length;
  }

  // Restore timers
  if (data.timers && data.timers.length > 0) {
    localStorage.setItem('twitchvote_timers', JSON.stringify(data.timers));
    restoredItems.timers = data.timers.length;
  }

  // Restore timer groups
  if (data.timerGroups && data.timerGroups.length > 0) {
    localStorage.setItem('twitchvote_timer_groups', JSON.stringify(data.timerGroups));
    restoredItems.timerGroups = data.timerGroups.length;
  }

  // Restore presets
  if (data.presets && data.presets.length > 0) {
    localStorage.setItem('twitch_vote_mod_presets', JSON.stringify(data.presets));
    restoredItems.presets = data.presets.length;
  }

  // Restore AI config (decrypt sensitive fields)
  if (data.aiConfig) {
    let aiConfig = { ...data.aiConfig };
    if (aiConfig.apiKey && typeof aiConfig.apiKey === 'string' && aiConfig.apiKey.startsWith('enc:')) {
      const decrypted = await decryptSensitiveData<string>(aiConfig.apiKey);
      aiConfig = { ...aiConfig, apiKey: decrypted };
    }
    localStorage.setItem('twitchvote_ai_config', JSON.stringify(aiConfig));
    restoredItems.aiConfig = true;
  }

  // Restore moderation settings
  if (data.moderationSettings) {
    localStorage.setItem('twitchvote_moderation_config', JSON.stringify(data.moderationSettings));
    restoredItems.moderationSettings = true;
  }

  // Restore custom sounds
  if (data.customSounds && data.customSounds.length > 0) {
    localStorage.setItem('twitchvote_custom_sounds', JSON.stringify(data.customSounds));
    restoredItems.customSounds = data.customSounds.length;
  }

  return restoredItems;
}

// ============================================
// HOOK RETURN TYPE
// ============================================

export interface UseBackupServiceReturn {
  /** Current backup configuration */
  config: BackupConfig;
  /** Current sync status */
  status: BackupSyncStatus;
  /** Whether a backup is in progress */
  isBackingUp: boolean;
  /** Whether a restore is in progress */
  isRestoring: boolean;
  /** Connect to a cloud provider */
  connect: (input: ConnectProviderInput) => Promise<{ success: boolean; error?: string }>;
  /** Disconnect from cloud provider */
  disconnect: () => void;
  /** Perform manual backup */
  backup: () => Promise<BackupResult>;
  /** Restore from cloud backup */
  restore: () => Promise<RestoreResult>;
  /** Schedule an auto-backup */
  scheduleBackup: (delayMs?: number) => void;
  /** Cancel scheduled backup */
  cancelScheduledBackup: () => void;
  /** Enable/disable auto-backup */
  setAutoBackupEnabled: (enabled: boolean) => void;
  /** Get last backup timestamp */
  lastBackupAt: number | null;
  /** Get last error message */
  lastError: string | null;
}

// ============================================
// MAIN HOOK
// ============================================

export function useBackupService(): UseBackupServiceReturn {
  const [storage, setStorage] = useState<BackupStorage>(() => loadBackupConfig());
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  
  const scheduledBackupRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);

  // Persist config changes
  useEffect(() => {
    saveBackupConfig(storage);
  }, [storage]);

  /**
   * Update config state
   */
  const updateConfig = useCallback((updates: Partial<BackupConfig>) => {
    setStorage((prev) => ({
      ...prev,
      config: { ...prev.config, ...updates },
    }));
  }, []);

  /**
   * Execute with retry logic
   * @requirements 3.6 - Retry up to 3 times with exponential backoff
   */
  const executeWithRetry = useCallback(
    async <T>(
      operation: () => Promise<{ success: boolean; error?: string } & T>,
      onStatusChange: (status: BackupSyncStatus) => void
    ): Promise<{ success: boolean; error?: string } & T> => {
      const { maxRetries, baseDelayMs, maxDelayMs } = DEFAULT_RETRY_CONFIG;
      
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const result = await operation();
        
        if (result.success) {
          retryCountRef.current = 0;
          return result;
        }

        if (attempt < maxRetries) {
          // Calculate delay with exponential backoff
          const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
          retryCountRef.current = attempt + 1;
          onStatusChange('syncing');
          
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      // All retries exhausted
      retryCountRef.current = 0;
      onStatusChange('error');
      return { success: false, error: 'All retry attempts failed' } as { success: boolean; error?: string } & T;
    },
    []
  );

  /**
   * Connect to a cloud provider
   * @requirements 3.1 - Connect to cloud storage provider
   */
  const connect = useCallback(
    async (input: ConnectProviderInput): Promise<{ success: boolean; error?: string }> => {
      const { provider, credentials } = input;

      // Validate credentials based on provider
      if (provider === 'google-drive' && !isGoogleDriveCredentials(credentials)) {
        return { success: false, error: 'Invalid Google Drive credentials' };
      }
      if (provider === 'custom-server' && !isCustomServerCredentials(credentials)) {
        return { success: false, error: 'Invalid custom server credentials' };
      }

      // Encrypt credentials before storing
      const encryptedCredentials = await encryptSensitiveData(credentials);

      updateConfig({
        provider,
        credentials: { encrypted: encryptedCredentials } as unknown as BackupCredentials,
        lastSyncStatus: 'pending',
        lastError: null,
        retryCount: 0,
      });

      // Perform initial backup
      // Note: We'll trigger this after state update
      return { success: true };
    },
    [updateConfig]
  );

  /**
   * Disconnect from cloud provider
   */
  const disconnect = useCallback(() => {
    cancelScheduledBackup();
    updateConfig({
      provider: null,
      credentials: null,
      lastSyncStatus: 'disconnected',
      autoBackupEnabled: false,
    });
  }, [updateConfig]);

  /**
   * Cancel scheduled backup
   */
  const cancelScheduledBackup = useCallback(() => {
    if (scheduledBackupRef.current) {
      clearTimeout(scheduledBackupRef.current);
      scheduledBackupRef.current = null;
    }
    setStorage((prev) => ({
      ...prev,
      scheduledBackupAt: null,
    }));
  }, []);

  /**
   * Perform backup operation
   * @requirements 3.2, 3.8 - Initial and manual backup
   */
  const backup = useCallback(async (): Promise<BackupResult> => {
    const { provider, credentials } = storage.config;

    if (!provider || !credentials) {
      return { success: false, timestamp: Date.now(), error: 'Not connected to any provider' };
    }

    setIsBackingUp(true);
    updateConfig({ lastSyncStatus: 'syncing' });

    try {
      // Decrypt stored credentials
      const decryptedCredentials = await decryptSensitiveData<BackupCredentials>(
        (credentials as unknown as { encrypted: string }).encrypted
      );

      // Collect data to backup
      const backupDataContent = await collectBackupData();
      
      // Generate checksum
      const checksum = await generateChecksum(backupDataContent);

      const backupData: BackupData = {
        version: BACKUP_DATA_VERSION,
        timestamp: Date.now(),
        application: 'streamcrowd',
        data: backupDataContent,
        checksum,
      };

      const dataString = JSON.stringify(backupData);

      // Upload based on provider
      const result = await executeWithRetry(
        async () => {
          if (provider === 'google-drive' && isGoogleDriveCredentials(decryptedCredentials)) {
            return googleDriveApi.upload(dataString, decryptedCredentials.accessToken);
          } else if (provider === 'custom-server' && isCustomServerCredentials(decryptedCredentials)) {
            return customServerApi.upload(
              dataString,
              decryptedCredentials.serverUrl,
              decryptedCredentials.apiKey
            );
          }
          return { success: false, error: 'Invalid provider configuration' };
        },
        (status) => updateConfig({ lastSyncStatus: status })
      );

      if (result.success) {
        updateConfig({
          lastBackupAt: Date.now(),
          lastSyncStatus: 'synced',
          lastError: null,
          retryCount: 0,
        });
        return { success: true, timestamp: Date.now(), bytesUploaded: dataString.length };
      } else {
        updateConfig({
          lastSyncStatus: 'error',
          lastError: result.error || 'Backup failed',
          retryCount: retryCountRef.current,
        });
        return { success: false, timestamp: Date.now(), error: result.error };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateConfig({
        lastSyncStatus: 'error',
        lastError: errorMessage,
      });
      return { success: false, timestamp: Date.now(), error: errorMessage };
    } finally {
      setIsBackingUp(false);
    }
  }, [storage.config, updateConfig, executeWithRetry]);

  /**
   * Restore from cloud backup
   * @requirements 3.5 - Restore from cloud backup
   */
  const restore = useCallback(async (): Promise<RestoreResult> => {
    const { provider, credentials } = storage.config;

    if (!provider || !credentials) {
      return {
        success: false,
        timestamp: Date.now(),
        error: 'Not connected to any provider',
        restoredItems: { commands: 0, timers: 0, timerGroups: 0, presets: 0, aiConfig: false, moderationSettings: false, customSounds: 0 },
      };
    }

    setIsRestoring(true);
    updateConfig({ lastSyncStatus: 'syncing' });

    try {
      // Decrypt stored credentials
      const decryptedCredentials = await decryptSensitiveData<BackupCredentials>(
        (credentials as unknown as { encrypted: string }).encrypted
      );

      // Download based on provider
      const result = await executeWithRetry(
        async () => {
          if (provider === 'google-drive' && isGoogleDriveCredentials(decryptedCredentials)) {
            return googleDriveApi.download(decryptedCredentials.accessToken);
          } else if (provider === 'custom-server' && isCustomServerCredentials(decryptedCredentials)) {
            return customServerApi.download(
              decryptedCredentials.serverUrl,
              decryptedCredentials.apiKey
            );
          }
          return { success: false, error: 'Invalid provider configuration' };
        },
        (status) => updateConfig({ lastSyncStatus: status })
      );

      if (!result.success || !result.data) {
        updateConfig({
          lastSyncStatus: 'error',
          lastError: result.error || 'Restore failed',
        });
        return {
          success: false,
          timestamp: Date.now(),
          error: result.error,
          restoredItems: { commands: 0, timers: 0, timerGroups: 0, presets: 0, aiConfig: false, moderationSettings: false, customSounds: 0 },
        };
      }

      // Parse and validate backup data
      const backupData: BackupData = JSON.parse(result.data);
      
      // Verify checksum
      const isValid = await verifyChecksum(backupData.data, backupData.checksum);
      if (!isValid) {
        updateConfig({
          lastSyncStatus: 'error',
          lastError: 'Backup data integrity check failed',
        });
        return {
          success: false,
          timestamp: Date.now(),
          error: 'Backup data integrity check failed',
          restoredItems: { commands: 0, timers: 0, timerGroups: 0, presets: 0, aiConfig: false, moderationSettings: false, customSounds: 0 },
        };
      }

      // Restore data
      const restoredItems = await restoreBackupData(backupData.data);

      updateConfig({
        lastSyncStatus: 'synced',
        lastError: null,
      });

      return {
        success: true,
        timestamp: Date.now(),
        restoredItems,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateConfig({
        lastSyncStatus: 'error',
        lastError: errorMessage,
      });
      return {
        success: false,
        timestamp: Date.now(),
        error: errorMessage,
        restoredItems: { commands: 0, timers: 0, timerGroups: 0, presets: 0, aiConfig: false, moderationSettings: false, customSounds: 0 },
      };
    } finally {
      setIsRestoring(false);
    }
  }, [storage.config, updateConfig, executeWithRetry]);

  /**
   * Schedule an auto-backup
   * @requirements 3.3 - Auto-backup within 5 minutes of modification
   */
  const scheduleBackup = useCallback(
    (delayMs: number = AUTO_BACKUP_DELAY_MS) => {
      // Cancel any existing scheduled backup
      if (scheduledBackupRef.current) {
        clearTimeout(scheduledBackupRef.current);
      }

      // Only schedule if auto-backup is enabled and connected
      if (!storage.config.autoBackupEnabled || !storage.config.provider) {
        return;
      }

      const scheduledAt = Date.now() + delayMs;
      setStorage((prev) => ({
        ...prev,
        scheduledBackupAt: scheduledAt,
      }));

      scheduledBackupRef.current = setTimeout(() => {
        backup();
        setStorage((prev) => ({
          ...prev,
          scheduledBackupAt: null,
        }));
      }, delayMs);
    },
    [storage.config.autoBackupEnabled, storage.config.provider, backup]
  );

  /**
   * Enable/disable auto-backup
   */
  const setAutoBackupEnabled = useCallback(
    (enabled: boolean) => {
      updateConfig({ autoBackupEnabled: enabled });
      if (!enabled) {
        cancelScheduledBackup();
      }
    },
    [updateConfig, cancelScheduledBackup]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scheduledBackupRef.current) {
        clearTimeout(scheduledBackupRef.current);
      }
    };
  }, []);

  return {
    config: storage.config,
    status: storage.config.lastSyncStatus,
    isBackingUp,
    isRestoring,
    connect,
    disconnect,
    backup,
    restore,
    scheduleBackup,
    cancelScheduledBackup,
    setAutoBackupEnabled,
    lastBackupAt: storage.config.lastBackupAt,
    lastError: storage.config.lastError,
  };
}

export default useBackupService;
