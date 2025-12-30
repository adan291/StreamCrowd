// SessionStorageService - Persistence for session metrics

import {
  SessionMetrics,
  Insight,
  DashboardLayout,
  METRICS_STORAGE_CONFIG,
  METRICS_STORAGE_KEYS,
} from '../../../types/metrics';
import { metricsAggregatorService } from './MetricsAggregatorService';

const STORES = {
  SESSIONS: 'sessions',
  INSIGHTS: 'insights',
  LAYOUTS: 'dashboardLayouts',
};

export class SessionStorageService {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(
        METRICS_STORAGE_CONFIG.DB_NAME,
        METRICS_STORAGE_CONFIG.DB_VERSION
      );

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Sessions store
        if (!db.objectStoreNames.contains(STORES.SESSIONS)) {
          const sessionsStore = db.createObjectStore(STORES.SESSIONS, { keyPath: 'id' });
          sessionsStore.createIndex('startTime', 'startTime', { unique: false });
          sessionsStore.createIndex('platform', 'platform', { unique: false });
          sessionsStore.createIndex('isFavorite', 'isFavorite', { unique: false });
        }

        // Insights store
        if (!db.objectStoreNames.contains(STORES.INSIGHTS)) {
          const insightsStore = db.createObjectStore(STORES.INSIGHTS, { keyPath: 'id' });
          insightsStore.createIndex('sessionId', 'sessionId', { unique: false });
          insightsStore.createIndex('type', 'type', { unique: false });
          insightsStore.createIndex('feedback', 'feedback', { unique: false });
        }

        // Dashboard layouts store
        if (!db.objectStoreNames.contains(STORES.LAYOUTS)) {
          db.createObjectStore(STORES.LAYOUTS, { keyPath: 'id' });
        }
      };
    });
  }

  // ============ Sessions CRUD ============

  async saveSession(session: SessionMetrics): Promise<SessionMetrics> {
    await this.init();

    // Check storage limits before saving
    await this.enforceStorageLimits();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORES.SESSIONS, 'readwrite');
      const store = tx.objectStore(STORES.SESSIONS);
      const request = store.put(session);

      request.onsuccess = () => resolve(session);
      request.onerror = () => reject(request.error);
    });
  }

  async getSession(id: string): Promise<SessionMetrics | null> {
    await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORES.SESSIONS, 'readonly');
      const store = tx.objectStore(STORES.SESSIONS);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAllSessions(options?: { limit?: number; offset?: number }): Promise<SessionMetrics[]> {
    await this.init();
    const limit = options?.limit || 100;
    const offset = options?.offset || 0;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORES.SESSIONS, 'readonly');
      const store = tx.objectStore(STORES.SESSIONS);
      const index = store.index('startTime');
      const request = index.openCursor(null, 'prev');

      const sessions: SessionMetrics[] = [];
      let skipped = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        
        if (cursor) {
          if (skipped < offset) {
            skipped++;
            cursor.continue();
          } else if (sessions.length < limit) {
            sessions.push(cursor.value);
            cursor.continue();
          } else {
            resolve(sessions);
          }
        } else {
          resolve(sessions);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteSession(id: string): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORES.SESSIONS, STORES.INSIGHTS], 'readwrite');
      
      // Delete session
      tx.objectStore(STORES.SESSIONS).delete(id);
      
      // Delete associated insights
      const insightsStore = tx.objectStore(STORES.INSIGHTS);
      const index = insightsStore.index('sessionId');
      const request = index.openCursor(IDBKeyRange.only(id));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async toggleFavorite(id: string): Promise<boolean> {
    await this.init();
    
    const session = await this.getSession(id);
    if (!session) return false;

    session.isFavorite = !session.isFavorite;
    await this.saveSession(session);
    return session.isFavorite;
  }

  // ============ Insights ============

  async saveInsight(insight: Insight): Promise<Insight> {
    await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORES.INSIGHTS, 'readwrite');
      const store = tx.objectStore(STORES.INSIGHTS);
      const request = store.put(insight);

      request.onsuccess = () => resolve(insight);
      request.onerror = () => reject(request.error);
    });
  }

  async getInsightsBySession(sessionId: string): Promise<Insight[]> {
    await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORES.INSIGHTS, 'readonly');
      const store = tx.objectStore(STORES.INSIGHTS);
      const index = store.index('sessionId');
      const request = index.getAll(IDBKeyRange.only(sessionId));

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async updateInsightFeedback(id: string, feedback: 'useful' | 'not_useful'): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORES.INSIGHTS, 'readwrite');
      const store = tx.objectStore(STORES.INSIGHTS);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const insight = getRequest.result;
        if (insight) {
          insight.feedback = feedback;
          store.put(insight);
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ============ Dashboard Layout ============

  async saveLayout(layout: DashboardLayout): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORES.LAYOUTS, 'readwrite');
      const store = tx.objectStore(STORES.LAYOUTS);
      const request = store.put(layout);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getLayout(id: string = 'default'): Promise<DashboardLayout | null> {
    await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORES.LAYOUTS, 'readonly');
      const store = tx.objectStore(STORES.LAYOUTS);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  // ============ Storage Management ============

  async getStorageUsage(): Promise<{ used: number; limit: number; sessionCount: number }> {
    await this.init();

    // Estimate storage usage
    const sessions = await this.getAllSessions({ limit: 1000 });
    let totalSize = 0;

    for (const session of sessions) {
      totalSize += JSON.stringify(session).length;
    }

    return {
      used: totalSize,
      limit: METRICS_STORAGE_CONFIG.MAX_TOTAL_SIZE,
      sessionCount: sessions.length,
    };
  }

  async enforceStorageLimits(): Promise<number> {
    const usage = await this.getStorageUsage();
    let deleted = 0;

    // Check session count limit
    if (usage.sessionCount >= METRICS_STORAGE_CONFIG.MAX_SESSIONS) {
      deleted += await this.cleanupOldSessions(1);
    }

    // Check storage size limit
    if (usage.used >= METRICS_STORAGE_CONFIG.MAX_TOTAL_SIZE * 0.9) {
      deleted += await this.cleanupOldSessions(5);
    }

    return deleted;
  }

  async cleanupOldSessions(count: number = 10): Promise<number> {
    await this.init();
    
    const now = Date.now();
    const retentionMs = METRICS_STORAGE_CONFIG.RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const favoriteRetentionMs = METRICS_STORAGE_CONFIG.FAVORITE_RETENTION_DAYS * 24 * 60 * 60 * 1000;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORES.SESSIONS, 'readwrite');
      const store = tx.objectStore(STORES.SESSIONS);
      const index = store.index('startTime');
      const request = index.openCursor(null, 'next');

      let deleted = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        
        if (cursor && deleted < count) {
          const session = cursor.value as SessionMetrics;
          const age = now - session.startTime;
          const maxAge = session.isFavorite ? favoriteRetentionMs : retentionMs;

          if (age > maxAge) {
            cursor.delete();
            deleted++;
          }
          cursor.continue();
        }
      };

      tx.oncomplete = () => resolve(deleted);
      tx.onerror = () => reject(tx.error);
    });
  }

  // ============ Aggregation ============

  async aggregateOldData(): Promise<void> {
    const sessions = await this.getAllSessions({ limit: 100 });
    const now = Date.now();

    for (const session of sessions) {
      let needsUpdate = false;

      for (const [metricType, series] of Object.entries(session.timeSeries)) {
        if (!series) continue;

        const targetResolution = metricsAggregatorService.needsAggregation(series, now);
        
        if (targetResolution) {
          session.timeSeries[metricType as keyof typeof session.timeSeries] = 
            metricsAggregatorService.aggregate(series, targetResolution);
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await this.saveSession(session);
      }
    }
  }
}

// Singleton instance
export const sessionStorageService = new SessionStorageService();
