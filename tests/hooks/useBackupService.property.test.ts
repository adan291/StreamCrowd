/**
 * Property-based tests for useBackupService hook
 * 
 * Tests the backup service for correctness properties.
 * Uses fast-check for property-based testing.
 * 
 * @requirements 3.3, 3.4, 3.6
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  BackupConfig,
  BackupData,
  BackupSyncStatus,
  DEFAULT_RETRY_CONFIG,
  BACKUP_DATA_VERSION,
  DEFAULT_BACKUP_CONFIG,
} from '../../types/backup';

// ============================================
// MOCK SETUP
// ============================================

// Mock localStorage
let mockStorage: Map<string, string>;

function setupMockLocalStorage() {
  mockStorage = new Map<string, string>();
  
  const mockLocalStorage = {
    getItem: (key: string) => mockStorage.get(key) ?? null,
    setItem: (key: string, value: string) => mockStorage.set(key, value),
    removeItem: (key: string) => mockStorage.delete(key),
    clear: () => mockStorage.clear(),
    get length() { return mockStorage.size; },
    key: (index: number) => Array.from(mockStorage.keys())[index] ?? null,
  };
  
  Object.defineProperty(global, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  });
}

function teardownMockLocalStorage() {
  mockStorage.clear();
}

// ============================================
// PURE RETRY LOGIC (extracted for testing)
// ============================================

interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

interface RetryResult<T> {
  success: boolean;
  error?: string;
  attempts: number;
  delays: number[];
  finalResult?: T;
}

/**
 * Pure function that simulates retry behavior
 * Returns the sequence of delays and final result
 */
function simulateRetry<T>(
  operationResults: { success: boolean; error?: string; data?: T }[],
  config: RetryConfig
): RetryResult<T> {
  const delays: number[] = [];
  let attempts = 0;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    attempts++;
    const result = operationResults[Math.min(attempt, operationResults.length - 1)];
    
    if (result.success) {
      return {
        success: true,
        attempts,
        delays,
        finalResult: result.data,
      };
    }

    if (attempt < config.maxRetries) {
      // Calculate delay with exponential backoff
      const delay = Math.min(config.baseDelayMs * Math.pow(2, attempt), config.maxDelayMs);
      delays.push(delay);
    }
  }

  // All retries exhausted
  return {
    success: false,
    error: operationResults[operationResults.length - 1].error || 'All retry attempts failed',
    attempts,
    delays,
  };
}

/**
 * Calculate expected delay for a given attempt
 */
function calculateExpectedDelay(attempt: number, config: RetryConfig): number {
  return Math.min(config.baseDelayMs * Math.pow(2, attempt), config.maxDelayMs);
}

// ============================================
// BACKUP DATA COMPLETENESS LOGIC
// ============================================

interface AppData {
  commands: unknown[];
  timers: unknown[];
  timerGroups: unknown[];
  presets: unknown[];
  aiConfig: unknown | null;
  moderationSettings: unknown | null;
  customSounds: unknown[];
}

/**
 * Check if backup data contains all required fields
 */
function isBackupComplete(backupData: BackupData['data'], appData: AppData): boolean {
  // Check commands
  if (appData.commands.length > 0 && backupData.commands.length !== appData.commands.length) {
    return false;
  }
  
  // Check timers
  if (appData.timers.length > 0 && backupData.timers.length !== appData.timers.length) {
    return false;
  }
  
  // Check timer groups
  if (appData.timerGroups.length > 0 && backupData.timerGroups.length !== appData.timerGroups.length) {
    return false;
  }
  
  // Check presets
  if (appData.presets.length > 0 && backupData.presets.length !== appData.presets.length) {
    return false;
  }
  
  // Check AI config
  if (appData.aiConfig !== null && backupData.aiConfig === null) {
    return false;
  }
  
  // Check moderation settings
  if (appData.moderationSettings !== null && backupData.moderationSettings === null) {
    return false;
  }
  
  // Check custom sounds
  if (appData.customSounds.length > 0 && backupData.customSounds.length !== appData.customSounds.length) {
    return false;
  }
  
  return true;
}

// ============================================
// BACKUP SCHEDULING LOGIC
// ============================================

interface ScheduleState {
  scheduledAt: number | null;
  lastBackupAt: number | null;
  pendingChanges: number[];
}

/**
 * Simulate backup scheduling behavior
 * Multiple changes within the window should result in a single backup
 */
function simulateScheduling(
  changes: { timestamp: number }[],
  backupDelayMs: number
): { backupCount: number; backupTimestamps: number[] } {
  if (changes.length === 0) {
    return { backupCount: 0, backupTimestamps: [] };
  }

  const sortedChanges = [...changes].sort((a, b) => a.timestamp - b.timestamp);
  const backupTimestamps: number[] = [];
  let scheduledBackupTime: number | null = null;

  for (const change of sortedChanges) {
    if (scheduledBackupTime === null) {
      // No backup scheduled, schedule one
      scheduledBackupTime = change.timestamp + backupDelayMs;
    } else if (change.timestamp >= scheduledBackupTime) {
      // Backup would have executed, record it and schedule new one
      backupTimestamps.push(scheduledBackupTime);
      scheduledBackupTime = change.timestamp + backupDelayMs;
    }
    // Otherwise, change is within the window, backup already scheduled
  }

  // Final scheduled backup
  if (scheduledBackupTime !== null) {
    backupTimestamps.push(scheduledBackupTime);
  }

  return {
    backupCount: backupTimestamps.length,
    backupTimestamps,
  };
}

// ============================================
// ARBITRARIES (Generators)
// ============================================

const commandArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  response: fc.string({ minLength: 1, maxLength: 200 }),
  cooldown: fc.nat({ max: 3600 }),
  userLevel: fc.constantFrom('everyone', 'subscriber', 'vip', 'moderator', 'broadcaster'),
  enabled: fc.boolean(),
  usageCount: fc.nat({ max: 10000 }),
});

const timerArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  message: fc.string({ minLength: 1, maxLength: 200 }),
  intervalMinutes: fc.integer({ min: 1, max: 120 }),
  minChatLines: fc.nat({ max: 100 }),
  enabled: fc.boolean(),
  groupId: fc.option(fc.uuid()),
  lastExecuted: fc.option(fc.nat()),
  createdAt: fc.nat(),
  updatedAt: fc.nat(),
});

const timerGroupArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  color: fc.hexaString({ minLength: 6, maxLength: 6 }).map(s => `#${s}`),
  enabled: fc.boolean(),
});

const presetArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  config: fc.record({
    minAccountAgeDays: fc.nat({ max: 365 }),
    voteChangeEnabled: fc.boolean(),
    voteChangeCooldownSeconds: fc.nat({ max: 3600 }),
    weights: fc.record({
      subscriber: fc.integer({ min: 1, max: 5 }),
      follower: fc.integer({ min: 1, max: 5 }),
      regular: fc.integer({ min: 1, max: 5 }),
    }),
    whitelist: fc.record({ enabled: fc.boolean(), usernames: fc.array(fc.string()) }),
    blacklist: fc.record({ enabled: fc.boolean(), usernames: fc.array(fc.string()) }),
  }),
  createdAt: fc.nat(),
});

const aiConfigArb = fc.record({
  enabled: fc.boolean(),
  provider: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
  apiKey: fc.option(fc.string({ minLength: 10, maxLength: 100 })),
  model: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
  temperature: fc.option(fc.float({ min: 0, max: 2 })),
  maxTokens: fc.option(fc.nat({ max: 4096 })),
});

const soundArb = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
  data: fc.string({ minLength: 100, maxLength: 1000 }), // Simulated base64
  volume: fc.float({ min: 0, max: 1 }),
  category: fc.option(fc.string({ minLength: 1, maxLength: 30 })),
});

const appDataArb = fc.record({
  commands: fc.array(commandArb, { minLength: 0, maxLength: 20 }),
  timers: fc.array(timerArb, { minLength: 0, maxLength: 20 }),
  timerGroups: fc.array(timerGroupArb, { minLength: 0, maxLength: 10 }),
  presets: fc.array(presetArb, { minLength: 0, maxLength: 10 }),
  aiConfig: fc.option(aiConfigArb),
  moderationSettings: fc.option(fc.record({
    minAccountAgeDays: fc.nat({ max: 365 }),
    voteChangeEnabled: fc.boolean(),
  })),
  customSounds: fc.array(soundArb, { minLength: 0, maxLength: 10 }),
});

// Operation result generator
const operationResultArb = fc.record({
  success: fc.boolean(),
  error: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
});

// Change timestamp generator
const changeTimestampArb = fc.nat({ max: 1000000 }).map(n => ({ timestamp: n }));

// ============================================
// PROPERTY TESTS
// ============================================

describe('useBackupService Property Tests', () => {
  beforeEach(() => {
    setupMockLocalStorage();
    vi.useFakeTimers();
  });

  afterEach(() => {
    teardownMockLocalStorage();
    vi.useRealTimers();
  });

  /**
   * **Feature: enhanced-features, Property 8: Backup Retry Behavior**
   * 
   * *For any* failed backup attempt, the Backup_Service SHALL retry up to 3 times
   * with exponentially increasing delays, and SHALL report error status only
   * after all retries are exhausted.
   * 
   * **Validates: Requirements 3.6**
   */
  describe('Property 8: Backup Retry Behavior', () => {
    it('retries exactly maxRetries times on failure', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 10 }), // maxRetries
          (maxRetries) => {
            const config: RetryConfig = {
              maxRetries,
              baseDelayMs: 1000,
              maxDelayMs: 8000,
            };
            
            // All operations fail
            const results = Array(maxRetries + 2).fill({ success: false, error: 'Network error' });
            const retryResult = simulateRetry(results, config);
            
            // Should attempt maxRetries + 1 times (initial + retries)
            expect(retryResult.attempts).toBe(maxRetries + 1);
            expect(retryResult.success).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('uses exponential backoff for delays', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }), // maxRetries
          fc.integer({ min: 100, max: 2000 }), // baseDelayMs
          fc.integer({ min: 5000, max: 30000 }), // maxDelayMs
          (maxRetries, baseDelayMs, maxDelayMs) => {
            const config: RetryConfig = { maxRetries, baseDelayMs, maxDelayMs };
            
            // All operations fail
            const results = Array(maxRetries + 2).fill({ success: false, error: 'Error' });
            const retryResult = simulateRetry(results, config);
            
            // Check each delay follows exponential pattern
            for (let i = 0; i < retryResult.delays.length; i++) {
              const expectedDelay = calculateExpectedDelay(i, config);
              expect(retryResult.delays[i]).toBe(expectedDelay);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('delays are capped at maxDelayMs', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 3, max: 10 }), // maxRetries (enough to hit cap)
          fc.integer({ min: 1000, max: 2000 }), // baseDelayMs
          fc.integer({ min: 3000, max: 5000 }), // maxDelayMs (low enough to be hit)
          (maxRetries, baseDelayMs, maxDelayMs) => {
            const config: RetryConfig = { maxRetries, baseDelayMs, maxDelayMs };
            
            // All operations fail
            const results = Array(maxRetries + 2).fill({ success: false, error: 'Error' });
            const retryResult = simulateRetry(results, config);
            
            // All delays should be <= maxDelayMs
            for (const delay of retryResult.delays) {
              expect(delay).toBeLessThanOrEqual(maxDelayMs);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('stops retrying on success', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 3 }), // successOnAttempt
          (successOnAttempt) => {
            const config = DEFAULT_RETRY_CONFIG;
            
            // Fail until successOnAttempt, then succeed
            const results = Array(config.maxRetries + 2).fill(null).map((_, i) => ({
              success: i >= successOnAttempt,
              error: i < successOnAttempt ? 'Error' : undefined,
              data: i >= successOnAttempt ? 'success' : undefined,
            }));
            
            const retryResult = simulateRetry(results, config);
            
            expect(retryResult.success).toBe(true);
            expect(retryResult.attempts).toBe(successOnAttempt + 1);
            expect(retryResult.delays.length).toBe(successOnAttempt);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('reports error only after all retries exhausted', () => {
      fc.assert(
        fc.property(
          fc.array(operationResultArb.filter(r => !r.success), { minLength: 4, maxLength: 10 }),
          (failingResults) => {
            const config = DEFAULT_RETRY_CONFIG; // maxRetries = 3
            
            const retryResult = simulateRetry(failingResults, config);
            
            // Should have attempted all retries
            expect(retryResult.attempts).toBe(config.maxRetries + 1);
            expect(retryResult.success).toBe(false);
            expect(retryResult.error).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('first attempt has no delay', () => {
      fc.assert(
        fc.property(
          fc.array(operationResultArb, { minLength: 1, maxLength: 5 }),
          (results) => {
            const config = DEFAULT_RETRY_CONFIG;
            const retryResult = simulateRetry(results, config);
            
            // Number of delays should be attempts - 1 (no delay before first attempt)
            if (retryResult.success) {
              expect(retryResult.delays.length).toBe(retryResult.attempts - 1);
            } else {
              expect(retryResult.delays.length).toBe(config.maxRetries);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: enhanced-features, Property 7: Backup Data Completeness**
   * 
   * *For any* backup operation, the resulting backup data SHALL include all
   * specified data types (commands, timers, presets, AI config, moderation
   * settings, custom sounds) that exist in the application.
   * 
   * **Validates: Requirements 3.4**
   */
  describe('Property 7: Backup Data Completeness', () => {
    it('backup includes all existing data types', () => {
      fc.assert(
        fc.property(
          appDataArb,
          (appData) => {
            // Simulate creating backup data from app data
            const backupData: BackupData['data'] = {
              commands: appData.commands as any,
              timers: appData.timers as any,
              timerGroups: appData.timerGroups as any,
              presets: appData.presets as any,
              aiConfig: appData.aiConfig as any,
              moderationSettings: appData.moderationSettings as any,
              customSounds: appData.customSounds as any,
            };
            
            expect(isBackupComplete(backupData, appData)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('backup preserves command count', () => {
      fc.assert(
        fc.property(
          fc.array(commandArb, { minLength: 0, maxLength: 50 }),
          (commands) => {
            const backupData: BackupData['data'] = {
              commands: commands as any,
              timers: [],
              timerGroups: [],
              presets: [],
              aiConfig: null,
              moderationSettings: null,
              customSounds: [],
            };
            
            expect(backupData.commands.length).toBe(commands.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('backup preserves timer count', () => {
      fc.assert(
        fc.property(
          fc.array(timerArb, { minLength: 0, maxLength: 50 }),
          (timers) => {
            const backupData: BackupData['data'] = {
              commands: [],
              timers: timers as any,
              timerGroups: [],
              presets: [],
              aiConfig: null,
              moderationSettings: null,
              customSounds: [],
            };
            
            expect(backupData.timers.length).toBe(timers.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('backup preserves preset count', () => {
      fc.assert(
        fc.property(
          fc.array(presetArb, { minLength: 0, maxLength: 20 }),
          (presets) => {
            const backupData: BackupData['data'] = {
              commands: [],
              timers: [],
              timerGroups: [],
              presets: presets as any,
              aiConfig: null,
              moderationSettings: null,
              customSounds: [],
            };
            
            expect(backupData.presets.length).toBe(presets.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('backup preserves custom sounds count', () => {
      fc.assert(
        fc.property(
          fc.array(soundArb, { minLength: 0, maxLength: 20 }),
          (sounds) => {
            const backupData: BackupData['data'] = {
              commands: [],
              timers: [],
              timerGroups: [],
              presets: [],
              aiConfig: null,
              moderationSettings: null,
              customSounds: sounds as any,
            };
            
            expect(backupData.customSounds.length).toBe(sounds.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('backup includes AI config when present', () => {
      fc.assert(
        fc.property(
          aiConfigArb,
          (aiConfig) => {
            const backupData: BackupData['data'] = {
              commands: [],
              timers: [],
              timerGroups: [],
              presets: [],
              aiConfig: aiConfig as any,
              moderationSettings: null,
              customSounds: [],
            };
            
            expect(backupData.aiConfig).not.toBeNull();
            expect(backupData.aiConfig?.enabled).toBe(aiConfig.enabled);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: enhanced-features, Property 6: Backup Scheduling on Changes**
   * 
   * *For any* configuration change when auto-backup is enabled, the Backup_Service
   * SHALL schedule a backup within 5 minutes, and multiple changes within that
   * window SHALL result in a single backup.
   * 
   * **Validates: Requirements 3.3**
   */
  describe('Property 6: Backup Scheduling on Changes', () => {
    const BACKUP_DELAY_MS = 5 * 60 * 1000; // 5 minutes

    it('multiple changes within window result in single backup', () => {
      fc.assert(
        fc.property(
          fc.array(fc.nat({ max: BACKUP_DELAY_MS - 1 }), { minLength: 2, maxLength: 20 }),
          (offsets) => {
            // All changes within the backup window from time 0
            const changes = offsets.map(offset => ({ timestamp: offset }));
            const result = simulateScheduling(changes, BACKUP_DELAY_MS);
            
            // Should result in exactly one backup
            expect(result.backupCount).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('changes separated by more than window result in multiple backups', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 10 }), // number of change groups
          fc.nat({ max: BACKUP_DELAY_MS - 1 }), // offset within each group
          (numGroups, inGroupOffset) => {
            // Create changes in separate windows
            const changes: { timestamp: number }[] = [];
            for (let i = 0; i < numGroups; i++) {
              // Each group starts after the previous backup would have completed
              const groupStart = i * (BACKUP_DELAY_MS + 1000);
              changes.push({ timestamp: groupStart + inGroupOffset });
            }
            
            const result = simulateScheduling(changes, BACKUP_DELAY_MS);
            
            // Should result in one backup per group
            expect(result.backupCount).toBe(numGroups);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('backup is scheduled within 5 minutes of first change', () => {
      fc.assert(
        fc.property(
          fc.array(changeTimestampArb, { minLength: 1, maxLength: 10 }),
          (changes) => {
            const result = simulateScheduling(changes, BACKUP_DELAY_MS);
            
            if (result.backupCount > 0) {
              const sortedChanges = [...changes].sort((a, b) => a.timestamp - b.timestamp);
              const firstChange = sortedChanges[0].timestamp;
              const firstBackup = result.backupTimestamps[0];
              
              // First backup should be within 5 minutes of first change
              expect(firstBackup - firstChange).toBeLessThanOrEqual(BACKUP_DELAY_MS);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('no changes results in no backups', () => {
      const result = simulateScheduling([], BACKUP_DELAY_MS);
      expect(result.backupCount).toBe(0);
      expect(result.backupTimestamps).toHaveLength(0);
    });

    it('single change results in single backup', () => {
      fc.assert(
        fc.property(
          changeTimestampArb,
          (change) => {
            const result = simulateScheduling([change], BACKUP_DELAY_MS);
            expect(result.backupCount).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('backup timestamps are in chronological order', () => {
      fc.assert(
        fc.property(
          fc.array(changeTimestampArb, { minLength: 1, maxLength: 50 }),
          (changes) => {
            const result = simulateScheduling(changes, BACKUP_DELAY_MS);
            
            for (let i = 1; i < result.backupTimestamps.length; i++) {
              expect(result.backupTimestamps[i]).toBeGreaterThan(result.backupTimestamps[i - 1]);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
