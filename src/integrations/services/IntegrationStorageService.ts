import type {
  StreamlabsTokens,
  StreamElementsConfig,
  IntegrationEvent,
  IntegrationSettings,
} from '../../../types/integrations';
import { DEFAULT_INTEGRATION_SETTINGS } from '../../../types/integrations';
import { encrypt, decrypt } from '../../application/utils/encryption';

const STORAGE_KEYS = {
  STREAMLABS_TOKENS: 'integration:streamlabs:tokens',
  STREAMELEMENTS_CONFIG: 'integration:streamelements:config',
  SETTINGS: 'integration:settings',
  EVENTS_DB: 'integration-events',
};

export class IntegrationStorageService {
  private encryptionKey: string;
  private db: IDBDatabase | null = null;

  constructor(encryptionKey: string = 'default-key') {
    this.encryptionKey = encryptionKey;
  }

  // ============================================
  // Token Storage (Encrypted)
  // ============================================

  async saveStreamlabsTokens(tokens: StreamlabsTokens): Promise<void> {
    const data = JSON.stringify({
      ...tokens,
      expiresAt: tokens.expiresAt.toISOString(),
    });
    const encrypted = await encrypt(data, this.encryptionKey);
    localStorage.setItem(STORAGE_KEYS.STREAMLABS_TOKENS, encrypted);
  }

  async getStreamlabsTokens(): Promise<StreamlabsTokens | null> {
    try {
      const encrypted = localStorage.getItem(STORAGE_KEYS.STREAMLABS_TOKENS);
      if (!encrypted) return null;

      const decrypted = await decrypt(encrypted, this.encryptionKey);
      const parsed = JSON.parse(decrypted);
      return {
        ...parsed,
        expiresAt: new Date(parsed.expiresAt),
      };
    } catch {
      return null;
    }
  }

  clearStreamlabsTokens(): void {
    localStorage.removeItem(STORAGE_KEYS.STREAMLABS_TOKENS);
  }

  async saveStreamElementsConfig(config: StreamElementsConfig): Promise<void> {
    const data = JSON.stringify(config);
    const encrypted = await encrypt(data, this.encryptionKey);
    localStorage.setItem(STORAGE_KEYS.STREAMELEMENTS_CONFIG, encrypted);
  }

  async getStreamElementsConfig(): Promise<StreamElementsConfig | null> {
    try {
      const encrypted = localStorage.getItem(STORAGE_KEYS.STREAMELEMENTS_CONFIG);
      if (!encrypted) return null;

      const decrypted = await decrypt(encrypted, this.encryptionKey);
      return JSON.parse(decrypted);
    } catch {
      return null;
    }
  }

  clearStreamElementsConfig(): void {
    localStorage.removeItem(STORAGE_KEYS.STREAMELEMENTS_CONFIG);
  }

  // ============================================
  // Settings Storage
  // ============================================

  saveSettings(settings: IntegrationSettings): void {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }

  getSettings(): IntegrationSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // Return defaults
    }
    return { ...DEFAULT_INTEGRATION_SETTINGS };
  }

  clearSettings(): void {
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
  }

  // ============================================
  // IndexedDB for Events
  // ============================================

  async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(STORAGE_KEYS.EVENTS_DB, 1);

      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('events')) {
          const store = db.createObjectStore('events', { keyPath: 'id' });
          store.createIndex('provider', 'provider', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async saveEvent(event: IntegrationEvent): Promise<void> {
    if (!this.db) await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['events'], 'readwrite');
      const store = transaction.objectStore('events');
      
      const request = store.put({
        ...event,
        timestamp: event.timestamp.toISOString(),
      });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getEvents(limit = 100): Promise<IntegrationEvent[]> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['events'], 'readonly');
      const store = transaction.objectStore('events');
      const index = store.index('timestamp');
      
      const events: IntegrationEvent[] = [];
      const request = index.openCursor(null, 'prev');

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor && events.length < limit) {
          const data = cursor.value;
          events.push({
            ...data,
            timestamp: new Date(data.timestamp),
          });
          cursor.continue();
        } else {
          resolve(events);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async clearEvents(): Promise<void> {
    if (!this.db) await this.initDB();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['events'], 'readwrite');
      const store = transaction.objectStore('events');
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteOldEvents(daysToKeep: number): Promise<number> {
    if (!this.db) await this.initDB();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['events'], 'readwrite');
      const store = transaction.objectStore('events');
      const index = store.index('timestamp');
      
      let deletedCount = 0;
      const range = IDBKeyRange.upperBound(cutoffDate.toISOString());
      const request = index.openCursor(range);

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          resolve(deletedCount);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  // ============================================
  // Clear All
  // ============================================

  async clearAll(): Promise<void> {
    this.clearStreamlabsTokens();
    this.clearStreamElementsConfig();
    this.clearSettings();
    await this.clearEvents();
  }
}
