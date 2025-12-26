/**
 * LocalStorageAdapter - Implementación de IStorage para localStorage
 * 
 * Proporciona una interfaz limpia sobre localStorage con soporte
 * para namespaces, TTL y suscripciones.
 */

import type { IStorage, IReactiveStorage, StorageOptions } from '../../domain/ports/IStorage';

interface StoredValue<T> {
  value: T;
  expiresAt?: number;
  namespace?: string;
}

export class LocalStorageAdapter implements IReactiveStorage {
  readonly storageId = 'localStorage';
  
  private prefix: string;
  private listeners = new Map<string, Set<(value: unknown) => void>>();
  
  constructor(prefix: string = 'app') {
    this.prefix = prefix;
    
    // Listen for storage events from other tabs
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorageEvent.bind(this));
    }
  }
  
  private getFullKey(key: string): string {
    return `${this.prefix}_${key}`;
  }
  
  async set<T>(key: string, value: T, options?: StorageOptions): Promise<void> {
    const fullKey = this.getFullKey(key);
    const stored: StoredValue<T> = {
      value,
      namespace: options?.namespace,
      expiresAt: options?.ttl ? Date.now() + options.ttl : undefined,
    };
    
    try {
      localStorage.setItem(fullKey, JSON.stringify(stored));
      this.notifyListeners(key, value);
    } catch (error) {
      // Handle quota exceeded
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, clearing old data...');
        this.clearExpired();
        // Retry once
        localStorage.setItem(fullKey, JSON.stringify(stored));
      } else {
        throw error;
      }
    }
  }
  
  async get<T>(key: string): Promise<T | null> {
    const fullKey = this.getFullKey(key);
    const raw = localStorage.getItem(fullKey);
    
    if (!raw) return null;
    
    try {
      const stored: StoredValue<T> = JSON.parse(raw);
      
      // Check expiration
      if (stored.expiresAt && Date.now() > stored.expiresAt) {
        localStorage.removeItem(fullKey);
        return null;
      }
      
      return stored.value;
    } catch {
      // Handle legacy data (not wrapped in StoredValue)
      try {
        return JSON.parse(raw) as T;
      } catch {
        return null;
      }
    }
  }
  
  async remove(key: string): Promise<void> {
    const fullKey = this.getFullKey(key);
    localStorage.removeItem(fullKey);
    this.notifyListeners(key, null);
  }
  
  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }
  
  async keys(prefix?: string): Promise<string[]> {
    const result: string[] = [];
    const searchPrefix = prefix 
      ? `${this.prefix}_${prefix}` 
      : this.prefix;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(searchPrefix)) {
        result.push(key.replace(`${this.prefix}_`, ''));
      }
    }
    
    return result;
  }
  
  async clear(namespace?: string): Promise<void> {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(this.prefix)) continue;
      
      if (namespace) {
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const stored = JSON.parse(raw);
            if (stored.namespace === namespace) {
              keysToRemove.push(key);
            }
          } catch { /* ignore */ }
        }
      } else {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }
  
  subscribe<T>(key: string, callback: (value: T | null) => void): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    
    this.listeners.get(key)!.add(callback as (value: unknown) => void);
    
    // Immediately call with current value
    this.get<T>(key).then(callback);
    
    return () => {
      const listeners = this.listeners.get(key);
      if (listeners) {
        listeners.delete(callback as (value: unknown) => void);
        if (listeners.size === 0) {
          this.listeners.delete(key);
        }
      }
    };
  }
  
  subscribeMany<T>(keys: string[], callback: (values: Record<string, T | null>) => void): () => void {
    const unsubscribes: Array<() => void> = [];
    const values: Record<string, T | null> = {};
    
    keys.forEach(key => {
      const unsub = this.subscribe<T>(key, (value) => {
        values[key] = value;
        callback({ ...values });
      });
      unsubscribes.push(unsub);
    });
    
    return () => unsubscribes.forEach(unsub => unsub());
  }
  
  private notifyListeners(key: string, value: unknown): void {
    const listeners = this.listeners.get(key);
    if (listeners) {
      listeners.forEach(cb => cb(value));
    }
  }
  
  private handleStorageEvent(event: StorageEvent): void {
    if (!event.key?.startsWith(this.prefix)) return;
    
    const key = event.key.replace(`${this.prefix}_`, '');
    
    if (event.newValue) {
      try {
        const stored = JSON.parse(event.newValue);
        this.notifyListeners(key, stored.value ?? stored);
      } catch { /* ignore */ }
    } else {
      this.notifyListeners(key, null);
    }
  }
  
  private clearExpired(): void {
    const now = Date.now();
    
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (!key?.startsWith(this.prefix)) continue;
      
      const raw = localStorage.getItem(key);
      if (raw) {
        try {
          const stored = JSON.parse(raw);
          if (stored.expiresAt && now > stored.expiresAt) {
            localStorage.removeItem(key);
          }
        } catch { /* ignore */ }
      }
    }
  }
}

// Singleton instance
let defaultInstance: LocalStorageAdapter | null = null;

export function getLocalStorageAdapter(): LocalStorageAdapter {
  if (!defaultInstance) {
    defaultInstance = new LocalStorageAdapter('twitch_vote');
  }
  return defaultInstance;
}
