// WebhookStorageService - Persistence for webhooks and deliveries

import {
  WebhookConfig,
  WebhookDelivery,
  IncomingWebhookConfig,
  IncomingWebhookLog,
  WebhookStats,
  WEBHOOK_STORAGE_KEYS,
  RATE_LIMIT_CONFIG,
} from '../../../types/webhooks';
import { encryptSensitiveData as encrypt, decryptSensitiveData as decrypt } from '../utils/encryption';

const DB_NAME = 'twitchvote_webhooks';
const DB_VERSION = 1;

const STORES = {
  WEBHOOKS: 'webhooks',
  DELIVERIES: 'deliveries',
  INCOMING_LOGS: 'incomingLogs',
};

export class WebhookStorageService {
  private db: IDBDatabase | null = null;
  private encryptionKey: string;

  constructor(encryptionKey: string = 'twitchvote_webhook_key') {
    this.encryptionKey = encryptionKey;
  }

  async init(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Webhooks store
        if (!db.objectStoreNames.contains(STORES.WEBHOOKS)) {
          const webhooksStore = db.createObjectStore(STORES.WEBHOOKS, { keyPath: 'id' });
          webhooksStore.createIndex('enabled', 'enabled', { unique: false });
          webhooksStore.createIndex('url', 'url', { unique: false });
        }

        // Deliveries store
        if (!db.objectStoreNames.contains(STORES.DELIVERIES)) {
          const deliveriesStore = db.createObjectStore(STORES.DELIVERIES, { keyPath: 'id' });
          deliveriesStore.createIndex('webhookId', 'webhookId', { unique: false });
          deliveriesStore.createIndex('status', 'status', { unique: false });
          deliveriesStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        // Incoming logs store
        if (!db.objectStoreNames.contains(STORES.INCOMING_LOGS)) {
          const logsStore = db.createObjectStore(STORES.INCOMING_LOGS, { keyPath: 'id' });
          logsStore.createIndex('command', 'command', { unique: false });
          logsStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });
  }

  // ============ Webhook CRUD ============

  async createWebhook(webhook: WebhookConfig): Promise<WebhookConfig> {
    await this.init();
    
    // Store secret encrypted
    const secretToStore = await this.encryptSecret(webhook.secret);
    const webhookToStore = { ...webhook, secret: secretToStore };

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORES.WEBHOOKS, 'readwrite');
      const store = tx.objectStore(STORES.WEBHOOKS);
      const request = store.add(webhookToStore);

      request.onsuccess = () => resolve(webhook);
      request.onerror = () => reject(request.error);
    });
  }

  async updateWebhook(id: string, updates: Partial<WebhookConfig>): Promise<WebhookConfig | null> {
    await this.init();
    
    const existing = await this.getWebhook(id);
    if (!existing) return null;

    const updated: WebhookConfig = {
      ...existing,
      ...updates,
      id, // Ensure ID doesn't change
      updatedAt: Date.now(),
    };

    // Encrypt secret if it was updated
    const secretToStore = updates.secret 
      ? await this.encryptSecret(updates.secret)
      : await this.encryptSecret(existing.secret);
    
    const webhookToStore = { ...updated, secret: secretToStore };

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORES.WEBHOOKS, 'readwrite');
      const store = tx.objectStore(STORES.WEBHOOKS);
      const request = store.put(webhookToStore);

      request.onsuccess = () => resolve(updated);
      request.onerror = () => reject(request.error);
    });
  }

  async deleteWebhook(id: string): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction([STORES.WEBHOOKS, STORES.DELIVERIES], 'readwrite');
      
      // Delete webhook
      tx.objectStore(STORES.WEBHOOKS).delete(id);
      
      // Delete associated deliveries
      const deliveriesStore = tx.objectStore(STORES.DELIVERIES);
      const index = deliveriesStore.index('webhookId');
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

  async getWebhook(id: string): Promise<WebhookConfig | null> {
    await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORES.WEBHOOKS, 'readonly');
      const store = tx.objectStore(STORES.WEBHOOKS);
      const request = store.get(id);

      request.onsuccess = async () => {
        if (!request.result) {
          resolve(null);
          return;
        }
        // Decrypt secret
        const webhook = request.result as WebhookConfig;
        webhook.secret = await this.decryptSecret(webhook.secret);
        resolve(webhook);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getAllWebhooks(): Promise<WebhookConfig[]> {
    await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORES.WEBHOOKS, 'readonly');
      const store = tx.objectStore(STORES.WEBHOOKS);
      const request = store.getAll();

      request.onsuccess = async () => {
        const webhooks = request.result as WebhookConfig[];
        // Decrypt all secrets
        for (const webhook of webhooks) {
          webhook.secret = await this.decryptSecret(webhook.secret);
        }
        resolve(webhooks);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getEnabledWebhooks(): Promise<WebhookConfig[]> {
    await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORES.WEBHOOKS, 'readonly');
      const store = tx.objectStore(STORES.WEBHOOKS);
      const index = store.index('enabled');
      const request = index.getAll(IDBKeyRange.only(true));

      request.onsuccess = async () => {
        const webhooks = request.result as WebhookConfig[];
        for (const webhook of webhooks) {
          webhook.secret = await this.decryptSecret(webhook.secret);
        }
        resolve(webhooks);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ============ Deliveries ============

  async saveDelivery(delivery: WebhookDelivery): Promise<WebhookDelivery> {
    await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORES.DELIVERIES, 'readwrite');
      const store = tx.objectStore(STORES.DELIVERIES);
      const request = store.put(delivery);

      request.onsuccess = () => resolve(delivery);
      request.onerror = () => reject(request.error);
    });
  }

  async getDelivery(id: string): Promise<WebhookDelivery | null> {
    await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORES.DELIVERIES, 'readonly');
      const store = tx.objectStore(STORES.DELIVERIES);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getDeliveriesByWebhook(webhookId: string, limit: number = 100): Promise<WebhookDelivery[]> {
    await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORES.DELIVERIES, 'readonly');
      const store = tx.objectStore(STORES.DELIVERIES);
      const index = store.index('webhookId');
      const request = index.getAll(IDBKeyRange.only(webhookId));

      request.onsuccess = () => {
        const deliveries = request.result as WebhookDelivery[];
        // Sort by createdAt descending and limit
        deliveries.sort((a, b) => b.createdAt - a.createdAt);
        resolve(deliveries.slice(0, limit));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingDeliveries(): Promise<WebhookDelivery[]> {
    await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORES.DELIVERIES, 'readonly');
      const store = tx.objectStore(STORES.DELIVERIES);
      const index = store.index('status');
      const request = index.getAll(IDBKeyRange.only('pending'));

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getWebhookStats(webhookId: string): Promise<WebhookStats> {
    const deliveries = await this.getDeliveriesByWebhook(webhookId, 1000);
    
    const stats: WebhookStats = {
      webhookId,
      totalSent: deliveries.length,
      totalSuccess: 0,
      totalFailed: 0,
      totalPending: 0,
    };

    for (const delivery of deliveries) {
      switch (delivery.status) {
        case 'success':
          stats.totalSuccess++;
          if (!stats.lastSuccess || delivery.completedAt! > stats.lastSuccess) {
            stats.lastSuccess = delivery.completedAt;
          }
          break;
        case 'failed':
          stats.totalFailed++;
          if (!stats.lastFailure || delivery.completedAt! > stats.lastFailure) {
            stats.lastFailure = delivery.completedAt;
          }
          break;
        case 'pending':
          stats.totalPending++;
          break;
      }
    }

    return stats;
  }

  // ============ Incoming Webhook Config ============

  async getIncomingConfig(): Promise<IncomingWebhookConfig | null> {
    const stored = localStorage.getItem(WEBHOOK_STORAGE_KEYS.INCOMING_CONFIG);
    if (!stored) return null;

    try {
      const config = JSON.parse(stored) as IncomingWebhookConfig;
      config.secret = await this.decryptSecret(config.secret);
      return config;
    } catch {
      return null;
    }
  }

  async saveIncomingConfig(config: IncomingWebhookConfig): Promise<void> {
    const encryptedSecret = await this.encryptSecret(config.secret);
    const toStore = { ...config, secret: encryptedSecret };
    localStorage.setItem(WEBHOOK_STORAGE_KEYS.INCOMING_CONFIG, JSON.stringify(toStore));
  }

  // ============ Incoming Logs ============

  async saveIncomingLog(log: IncomingWebhookLog): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORES.INCOMING_LOGS, 'readwrite');
      const store = tx.objectStore(STORES.INCOMING_LOGS);
      const request = store.add(log);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getIncomingLogs(limit: number = 100): Promise<IncomingWebhookLog[]> {
    await this.init();

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORES.INCOMING_LOGS, 'readonly');
      const store = tx.objectStore(STORES.INCOMING_LOGS);
      const index = store.index('createdAt');
      const request = index.openCursor(null, 'prev');
      
      const logs: IncomingWebhookLog[] = [];

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor && logs.length < limit) {
          logs.push(cursor.value);
          cursor.continue();
        } else {
          resolve(logs);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }

  // ============ Encryption Helpers ============

  private async encryptSecret(secret: string): Promise<string> {
    try {
      return await encrypt(secret);
    } catch {
      // Fallback: base64 encode if encryption fails
      return btoa(secret);
    }
  }

  private async decryptSecret(encrypted: string): Promise<string> {
    try {
      return await decrypt<string>(encrypted);
    } catch {
      // Fallback: try base64 decode
      try {
        return atob(encrypted);
      } catch {
        return encrypted;
      }
    }
  }

  // ============ Cleanup ============

  async cleanupOldDeliveries(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    await this.init();
    const cutoff = Date.now() - maxAge;
    let deleted = 0;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(STORES.DELIVERIES, 'readwrite');
      const store = tx.objectStore(STORES.DELIVERIES);
      const index = store.index('createdAt');
      const request = index.openCursor(IDBKeyRange.upperBound(cutoff));

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          deleted++;
          cursor.continue();
        }
      };

      tx.oncomplete = () => resolve(deleted);
      tx.onerror = () => reject(tx.error);
    });
  }
}

// Singleton instance
export const webhookStorageService = new WebhookStorageService();
