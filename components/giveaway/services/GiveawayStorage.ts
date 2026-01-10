/**
 * GiveawayStorage Service
 * Handles all persistence operations for the giveaway system
 * with validation, migration, and error handling.
 */

import type {
  GiveawayThread,
  FinishedGiveaway,
  GiveawayStats,
  SubsGiveawayConfig,
  GiveawayExport,
  DEFAULT_SUBS_CONFIG,
  DEFAULT_STATS,
} from '../types';

// ============================================
// ERROR TYPES
// ============================================

export type StorageErrorCode = 
  | 'QUOTA_EXCEEDED' 
  | 'PARSE_ERROR' 
  | 'VALIDATION_ERROR' 
  | 'MIGRATION_ERROR'
  | 'IMPORT_ERROR';

export class GiveawayStorageError extends Error {
  constructor(
    message: string,
    public readonly code: StorageErrorCode,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'GiveawayStorageError';
  }
}

// ============================================
// VALIDATION TYPES
// ============================================

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

// ============================================
// IMPORT RESULT
// ============================================

export interface ImportResult {
  success: boolean;
  threadsImported: number;
  historyImported: number;
  errors: string[];
}

// ============================================
// STORAGE KEYS
// ============================================

const STORAGE_KEYS = {
  threads: 'giveaway_threads',
  history: 'giveaway_history',
  stats: 'giveaway_stats',
  config: 'giveaway_subs_config',
  blacklist: 'giveaway_blacklist',
  backup: 'giveaway_backup',
} as const;

// ============================================
// VERSION MANAGEMENT
// ============================================

const CURRENT_VERSION = 2;

interface VersionedData {
  version?: number;
  [key: string]: unknown;
}

// ============================================
// GIVEAWAY STORAGE CLASS
// ============================================

export class GiveawayStorage {
  // ============================================
  // THREADS
  // ============================================

  static saveThreads(threads: GiveawayThread[]): void {
    try {
      const validation = this.validateThreads(threads);
      if (!validation.isValid) {
        console.error('Thread validation errors:', validation.errors);
        throw new GiveawayStorageError(
          `Invalid thread data: ${validation.errors.join(', ')}`,
          'VALIDATION_ERROR'
        );
      }

      const json = JSON.stringify(threads);
      localStorage.setItem(STORAGE_KEYS.threads, json);
    } catch (error) {
      this.handleStorageError(error, 'saveThreads');
    }
  }

  static getThreads(): GiveawayThread[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.threads);
      if (!data) return [];

      const parsed = JSON.parse(data);
      const migrated = this.migrateThreads(parsed);
      return migrated;
    } catch (error) {
      console.error('Error loading threads:', error);
      return [];
    }
  }

  // ============================================
  // HISTORY
  // ============================================

  static saveHistory(history: FinishedGiveaway[]): void {
    try {
      // Limit history to 100 entries
      const limited = history.slice(0, 100);
      localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(limited));
    } catch (error) {
      this.handleStorageError(error, 'saveHistory');
    }
  }

  static getHistory(): FinishedGiveaway[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.history);
      if (!data) return [];
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading history:', error);
      return [];
    }
  }

  static addToHistory(giveaway: FinishedGiveaway): void {
    const history = this.getHistory();
    history.unshift(giveaway);
    this.saveHistory(history);
  }

  // ============================================
  // STATS
  // ============================================

  static saveStats(stats: GiveawayStats): void {
    try {
      localStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(stats));
    } catch (error) {
      this.handleStorageError(error, 'saveStats');
    }
  }

  static getStats(): GiveawayStats {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.stats);
      if (!data) return this.getDefaultStats();
      return { ...this.getDefaultStats(), ...JSON.parse(data) };
    } catch (error) {
      console.error('Error loading stats:', error);
      return this.getDefaultStats();
    }
  }

  static updateStats(giveaway: FinishedGiveaway): void {
    const stats = this.getStats();
    
    stats.totalGiveaways += 1;
    stats.totalParticipants += giveaway.participantCount;
    stats.participantCounts.push(giveaway.participantCount);
    
    if (!stats.uniqueWinners.includes(giveaway.winner)) {
      stats.uniqueWinners.push(giveaway.winner);
    }
    
    if (giveaway.mode in stats.byMode) {
      stats.byMode[giveaway.mode] += 1;
    }
    
    stats.lastUpdated = Date.now();
    
    this.saveStats(stats);
  }

  // ============================================
  // CONFIG
  // ============================================

  static saveConfig(config: SubsGiveawayConfig): void {
    try {
      localStorage.setItem(STORAGE_KEYS.config, JSON.stringify(config));
    } catch (error) {
      this.handleStorageError(error, 'saveConfig');
    }
  }

  static getConfig(): SubsGiveawayConfig {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.config);
      if (!data) return this.getDefaultConfig();
      return { ...this.getDefaultConfig(), ...JSON.parse(data) };
    } catch (error) {
      console.error('Error loading config:', error);
      return this.getDefaultConfig();
    }
  }

  // ============================================
  // BLACKLIST
  // ============================================

  static saveBlacklist(blacklist: string[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.blacklist, JSON.stringify(blacklist));
    } catch (error) {
      this.handleStorageError(error, 'saveBlacklist');
    }
  }

  static getBlacklist(): string[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.blacklist);
      if (!data) return [];
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading blacklist:', error);
      return [];
    }
  }

  static addToBlacklist(username: string): void {
    const blacklist = this.getBlacklist();
    const normalized = username.toLowerCase().trim();
    if (!blacklist.includes(normalized)) {
      blacklist.push(normalized);
      this.saveBlacklist(blacklist);
    }
  }

  static removeFromBlacklist(username: string): void {
    const blacklist = this.getBlacklist();
    const normalized = username.toLowerCase().trim();
    const filtered = blacklist.filter(u => u !== normalized);
    this.saveBlacklist(filtered);
  }

  // ============================================
  // BACKUP
  // ============================================

  static saveBackup(): void {
    try {
      const backup: GiveawayExport = {
        version: CURRENT_VERSION,
        exportedAt: Date.now(),
        threads: this.getThreads(),
        history: this.getHistory(),
      };
      localStorage.setItem(STORAGE_KEYS.backup, JSON.stringify(backup));
    } catch (error) {
      console.error('Error saving backup:', error);
    }
  }

  static getBackup(): GiveawayExport | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.backup);
      if (!data) return null;
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading backup:', error);
      return null;
    }
  }

  static clearBackup(): void {
    localStorage.removeItem(STORAGE_KEYS.backup);
  }

  static hasBackup(): boolean {
    return localStorage.getItem(STORAGE_KEYS.backup) !== null;
  }


  // ============================================
  // VALIDATION
  // ============================================

  static validate(data: unknown): ValidationResult {
    const errors: string[] = [];

    if (!data || typeof data !== 'object') {
      return { isValid: false, errors: ['Data must be an object'] };
    }

    const obj = data as Record<string, unknown>;

    // Validate threads if present
    if ('threads' in obj) {
      const threadValidation = this.validateThreads(obj.threads as GiveawayThread[]);
      errors.push(...threadValidation.errors);
    }

    // Validate history if present
    if ('history' in obj) {
      const historyValidation = this.validateHistory(obj.history as FinishedGiveaway[]);
      errors.push(...historyValidation.errors);
    }

    return { isValid: errors.length === 0, errors };
  }

  static validateThreads(threads: unknown): ValidationResult {
    const errors: string[] = [];

    if (!Array.isArray(threads)) {
      return { isValid: false, errors: ['Threads must be an array'] };
    }

    threads.forEach((thread, index) => {
      if (!thread || typeof thread !== 'object') {
        errors.push(`Thread[${index}] must be an object`);
        return;
      }

      const t = thread as Record<string, unknown>;

      if (!t.id || typeof t.id !== 'string') {
        errors.push(`Thread[${index}] missing or invalid id`);
      }
      if (!t.name || typeof t.name !== 'string') {
        errors.push(`Thread[${index}] missing or invalid name`);
      }
      if (typeof t.keyword !== 'string') {
        errors.push(`Thread[${index}] missing or invalid keyword`);
      }
      if (typeof t.isActive !== 'boolean') {
        errors.push(`Thread[${index}] missing or invalid isActive`);
      }
      if (!Array.isArray(t.participants)) {
        errors.push(`Thread[${index}] missing or invalid participants`);
      }
      if (typeof t.createdAt !== 'number') {
        errors.push(`Thread[${index}] missing or invalid createdAt`);
      }
    });

    return { isValid: errors.length === 0, errors };
  }

  static validateHistory(history: unknown): ValidationResult {
    const errors: string[] = [];

    if (!Array.isArray(history)) {
      return { isValid: false, errors: ['History must be an array'] };
    }

    history.forEach((item, index) => {
      if (!item || typeof item !== 'object') {
        errors.push(`History[${index}] must be an object`);
        return;
      }

      const h = item as Record<string, unknown>;

      if (!h.id || typeof h.id !== 'string') {
        errors.push(`History[${index}] missing or invalid id`);
      }
      if (!h.winner || typeof h.winner !== 'string') {
        errors.push(`History[${index}] missing or invalid winner`);
      }
      if (typeof h.participantCount !== 'number') {
        errors.push(`History[${index}] missing or invalid participantCount`);
      }
    });

    return { isValid: errors.length === 0, errors };
  }

  // ============================================
  // MIGRATION
  // ============================================

  static migrate(data: unknown): GiveawayExport {
    if (!data || typeof data !== 'object') {
      return this.getDefaultExport();
    }

    const versioned = data as VersionedData;
    const version = versioned.version || 1;

    if (version === 1) {
      return this.migrateV1toV2(data);
    }

    // Already at current version
    return data as GiveawayExport;
  }

  private static migrateV1toV2(data: unknown): GiveawayExport {
    const v1 = data as {
      threads?: unknown[];
      history?: unknown[];
      exportedAt?: number;
    };

    const threads = this.migrateThreads(v1.threads || []);
    const history = (v1.history || []) as FinishedGiveaway[];

    return {
      version: CURRENT_VERSION,
      exportedAt: v1.exportedAt || Date.now(),
      threads,
      history,
    };
  }

  private static migrateThreads(threads: unknown[]): GiveawayThread[] {
    if (!Array.isArray(threads)) return [];

    return threads.map((thread) => {
      const t = thread as Record<string, unknown>;
      
      return {
        id: (t.id as string) || this.generateId(),
        name: (t.name as string) || 'Sorteo',
        keyword: (t.keyword as string) || '',
        isActive: Boolean(t.isActive),
        participants: Array.isArray(t.participants) ? t.participants : [],
        createdAt: (t.createdAt as number) || Date.now(),
        closedAt: t.closedAt as number | undefined,
        winner: t.winner as GiveawayThread['winner'],
        subscribersOnly: Boolean(t.subscribersOnly),
        allowMultipleEntries: Boolean(t.allowMultipleEntries),
        // Migration: default to 'keyword' for old threads without mode
        mode: (t.mode as 'keyword' | 'subs') || 'keyword',
        subsConfig: t.subsConfig as SubsGiveawayConfig | undefined,
        startsAt: t.startsAt as number | undefined,
        endsAt: t.endsAt as number | undefined,
        prizeImages: t.prizeImages as string[] | undefined,
      };
    });
  }

  // ============================================
  // EXPORT / IMPORT
  // ============================================

  static exportAll(): string {
    const data: GiveawayExport = {
      version: CURRENT_VERSION,
      exportedAt: Date.now(),
      threads: this.getThreads(),
      history: this.getHistory(),
    };

    return JSON.stringify(data, null, 2);
  }

  static importAll(json: string): ImportResult {
    const result: ImportResult = {
      success: false,
      threadsImported: 0,
      historyImported: 0,
      errors: [],
    };

    try {
      const data = JSON.parse(json);
      
      // Validate structure
      const validation = this.validate(data);
      if (!validation.isValid) {
        result.errors = validation.errors;
        return result;
      }

      // Migrate if needed
      const migrated = this.migrate(data);

      // Import threads (merge with existing, avoid duplicates)
      if (migrated.threads && migrated.threads.length > 0) {
        const existingThreads = this.getThreads();
        const existingIds = new Set(existingThreads.map(t => t.id));
        
        const newThreads = migrated.threads.filter(t => !existingIds.has(t.id));
        const mergedThreads = [...existingThreads, ...newThreads];
        
        this.saveThreads(mergedThreads);
        result.threadsImported = newThreads.length;
      }

      // Import history (merge with existing, avoid duplicates)
      if (migrated.history && migrated.history.length > 0) {
        const existingHistory = this.getHistory();
        const existingIds = new Set(existingHistory.map(h => h.id));
        
        const newHistory = migrated.history.filter(h => !existingIds.has(h.id));
        const mergedHistory = [...newHistory, ...existingHistory].slice(0, 100);
        
        this.saveHistory(mergedHistory);
        result.historyImported = newHistory.length;
      }

      result.success = true;
    } catch (error) {
      if (error instanceof SyntaxError) {
        result.errors.push('Invalid JSON format');
      } else if (error instanceof GiveawayStorageError) {
        result.errors.push(error.message);
      } else {
        result.errors.push('Unknown error during import');
      }
    }

    return result;
  }

  // ============================================
  // ERROR HANDLING
  // ============================================

  private static handleStorageError(error: unknown, operation: string): void {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.error(`Storage quota exceeded during ${operation}`);
      throw new GiveawayStorageError(
        'Storage quota exceeded. Please export and clear old data.',
        'QUOTA_EXCEEDED',
        error
      );
    }

    if (error instanceof GiveawayStorageError) {
      throw error;
    }

    console.error(`Error during ${operation}:`, error);
    // Don't throw for other errors, just log them
  }

  // ============================================
  // HELPERS
  // ============================================

  private static generateId(): string {
    return Math.random().toString(36).substring(2, 9);
  }

  private static getDefaultExport(): GiveawayExport {
    return {
      version: CURRENT_VERSION,
      exportedAt: Date.now(),
      threads: [],
      history: [],
    };
  }

  private static getDefaultStats(): GiveawayStats {
    return {
      totalGiveaways: 0,
      totalParticipants: 0,
      uniqueWinners: [],
      participantCounts: [],
      byMode: { viewers: 0, keyword: 0, subs: 0 },
      lastUpdated: Date.now(),
    };
  }

  private static getDefaultConfig(): SubsGiveawayConfig {
    return {
      tier1Value: 1,
      tier2Value: 2,
      tier3Value: 5,
      primeValue: 1,
      resubEnabled: true,
      resubValue: 1,
      resubBonusPerMonth: 0,
      giftSubEnabled: true,
      giftSubValue: 1,
      bitsEnabled: false,
      bitsPerEntry: 100,
      bitsMinimum: 100,
      donationsEnabled: false,
      donationPerEntry: 1,
      donationMinimum: 1,
      donationCurrency: 'EUR',
      channelGiftsEnabled: false,
      channelGiftValue: 1,
    };
  }

  // ============================================
  // CLEAR ALL
  // ============================================

  static clearAll(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }
}

export default GiveawayStorage;
