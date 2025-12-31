/**
 * IndexedDBService - Servicio de almacenamiento persistente con IndexedDB
 * 
 * Este servicio implementa almacenamiento persistente usando IndexedDB
 * con fallback a localStorage si IndexedDB no está disponible.
 * 
 * @requirements 1.1, 1.2, 1.3, 1.4, 1.5
 */

// ============ TYPES ============

/**
 * Schema de la base de datos IndexedDB
 */
export interface DBSchema {
  polls: unknown[];
  predictions: unknown[];
  giveaways: unknown[];
  commands: unknown[];
  timers: unknown[];
  settings: Record<string, unknown>;
  syncQueue: SyncOperation[];
  migrations: MigrationRecord[];
}

/**
 * Operación de sincronización pendiente
 */
export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  store: string;
  key: string;
  data: unknown;
  timestamp: number;
  retries: number;
  maxRetries: number;
  lastError?: string;
}

/**
 * Registro de migración
 */
export interface MigrationRecord {
  id: string;
  completedAt: number;
  version: number;
}

/**
 * Configuración de un object store
 */
interface StoreConfig {
  keyPath: string;
  indexes?: { name: string; keyPath: string; unique?: boolean }[];
}

/**
 * Interfaz del servicio IndexedDB
 */
export interface IIndexedDBService {
  init(): Promise<void>;
  get<T>(store: keyof DBSchema, key: string): Promise<T | null>;
  getAll<T>(store: keyof DBSchema): Promise<T[]>;
  put<T>(store: keyof DBSchema, key: string, value: T): Promise<void>;
  delete(store: keyof DBSchema, key: string): Promise<void>;
  clear(store: keyof DBSchema): Promise<void>;
  isAvailable(): boolean;
}

// ============ CONSTANTS ============

const DB_NAME = 'twitchvote_db';
const DB_VERSION = 1;

/**
 * Configuración de los object stores
 */
const STORES: Record<keyof DBSchema, StoreConfig> = {
  polls: { 
    keyPath: 'id', 
    indexes: [
      { name: 'createdAt', keyPath: 'createdAt' },
      { name: 'status', keyPath: 'status' }
    ]
  },
  predictions: { 
    keyPath: 'id', 
    indexes: [
      { name: 'createdAt', keyPath: 'createdAt' },
      { name: 'status', keyPath: 'status' }
    ]
  },
  giveaways: { 
    keyPath: 'id', 
    indexes: [
      { name: 'createdAt', keyPath: 'createdAt' },
      { name: 'status', keyPath: 'status' }
    ]
  },
  commands: { 
    keyPath: 'id', 
    indexes: [
      { name: 'name', keyPath: 'name' },
      { name: 'enabled', keyPath: 'enabled' }
    ]
  },
  timers: { 
    keyPath: 'id', 
    indexes: [
      { name: 'name', keyPath: 'name' },
      { name: 'enabled', keyPath: 'enabled' }
    ]
  },
  settings: { keyPath: 'key' },
  syncQueue: { 
    keyPath: 'id', 
    indexes: [
      { name: 'timestamp', keyPath: 'timestamp' },
      { name: 'type', keyPath: 'type' }
    ]
  },
  migrations: { keyPath: 'id' }
};

const LOCALSTORAGE_PREFIX = 'twitchvote_fallback_';

// ============ INDEXEDDB SERVICE CLASS ============

/**
 * Servicio de almacenamiento con IndexedDB
 * 
 * Proporciona operaciones CRUD con persistencia en IndexedDB
 * y fallback automático a localStorage si IndexedDB no está disponible.
 */
export class IndexedDBService implements IIndexedDBService {
  private db: IDBDatabase | null = null;
  private isIndexedDBAvailable: boolean = false;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.isIndexedDBAvailable = this.checkIndexedDBSupport();
  }

  // ============ INITIALIZATION ============

  /**
   * Verifica si IndexedDB está disponible en el navegador
   */
  private checkIndexedDBSupport(): boolean {
    try {
      if (typeof window === 'undefined') return false;
      if (!window.indexedDB) return false;
      
      // Test if IndexedDB is actually usable (some browsers block it in private mode)
      const testRequest = window.indexedDB.open('__test__');
      testRequest.onerror = () => {
        this.isIndexedDBAvailable = false;
      };
      testRequest.onsuccess = () => {
        testRequest.result.close();
        window.indexedDB.deleteDatabase('__test__');
      };
      
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Inicializa la base de datos IndexedDB
   * Crea las tablas necesarias según el schema definido
   * 
   * @requirements 1.1
   */
  async init(): Promise<void> {
    // Return existing promise if already initializing
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.initializeDatabase();
    return this.initPromise;
  }

  private async initializeDatabase(): Promise<void> {
    if (!this.isIndexedDBAvailable) {
      console.warn('IndexedDB not available, using localStorage fallback');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
          console.error('IndexedDB open error:', request.error);
          this.isIndexedDBAvailable = false;
          resolve(); // Resolve anyway, will use fallback
        };

        request.onsuccess = () => {
          this.db = request.result;
          
          // Handle connection errors
          this.db.onerror = (event) => {
            console.error('IndexedDB error:', event);
          };

          // Handle version change (another tab upgraded the DB)
          this.db.onversionchange = () => {
            this.db?.close();
            this.db = null;
            console.warn('IndexedDB version changed, please reload');
          };

          resolve();
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          this.createStores(db);
        };
      } catch (error) {
        console.error('IndexedDB initialization error:', error);
        this.isIndexedDBAvailable = false;
        resolve(); // Resolve anyway, will use fallback
      }
    });
  }

  /**
   * Crea los object stores según el schema
   */
  private createStores(db: IDBDatabase): void {
    for (const [storeName, config] of Object.entries(STORES)) {
      if (!db.objectStoreNames.contains(storeName)) {
        const store = db.createObjectStore(storeName, { keyPath: config.keyPath });
        
        // Create indexes
        if (config.indexes) {
          for (const index of config.indexes) {
            store.createIndex(index.name, index.keyPath, { unique: index.unique || false });
          }
        }
      }
    }
  }

  // ============ PUBLIC API ============

  /**
   * Verifica si IndexedDB está disponible
   */
  isAvailable(): boolean {
    return this.isIndexedDBAvailable && this.db !== null;
  }

  /**
   * Obtiene un valor por clave de un store
   * 
   * @requirements 1.3
   */
  async get<T>(store: keyof DBSchema, key: string): Promise<T | null> {
    await this.ensureInitialized();

    if (this.isAvailable()) {
      return this.getFromIndexedDB<T>(store, key);
    }
    return this.getFromLocalStorage<T>(store, key);
  }

  /**
   * Obtiene todos los valores de un store
   * 
   * @requirements 1.3
   */
  async getAll<T>(store: keyof DBSchema): Promise<T[]> {
    await this.ensureInitialized();

    if (this.isAvailable()) {
      return this.getAllFromIndexedDB<T>(store);
    }
    return this.getAllFromLocalStorage<T>(store);
  }

  /**
   * Guarda un valor en un store
   * 
   * @requirements 1.2
   */
  async put<T>(store: keyof DBSchema, key: string, value: T): Promise<void> {
    await this.ensureInitialized();

    // Add timestamp if not present
    const valueWithTimestamp = this.addTimestamp(value);

    if (this.isAvailable()) {
      return this.putToIndexedDB(store, key, valueWithTimestamp);
    }
    return this.putToLocalStorage(store, key, valueWithTimestamp);
  }

  /**
   * Elimina un valor de un store
   */
  async delete(store: keyof DBSchema, key: string): Promise<void> {
    await this.ensureInitialized();

    if (this.isAvailable()) {
      return this.deleteFromIndexedDB(store, key);
    }
    return this.deleteFromLocalStorage(store, key);
  }

  /**
   * Limpia todos los valores de un store
   */
  async clear(store: keyof DBSchema): Promise<void> {
    await this.ensureInitialized();

    if (this.isAvailable()) {
      return this.clearIndexedDB(store);
    }
    return this.clearLocalStorage(store);
  }

  // ============ INDEXEDDB OPERATIONS ============

  private async ensureInitialized(): Promise<void> {
    if (!this.initPromise) {
      await this.init();
    } else {
      await this.initPromise;
    }
  }

  private async getFromIndexedDB<T>(store: keyof DBSchema, key: string): Promise<T | null> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve(null);
        return;
      }

      try {
        const transaction = this.db.transaction(store, 'readonly');
        const objectStore = transaction.objectStore(store);
        const request = objectStore.get(key);

        request.onsuccess = () => {
          resolve(request.result || null);
        };

        request.onerror = () => {
          console.error(`IndexedDB get error for ${store}/${key}:`, request.error);
          reject(request.error);
        };
      } catch (error) {
        console.error(`IndexedDB get error for ${store}/${key}:`, error);
        reject(error);
      }
    });
  }

  private async getAllFromIndexedDB<T>(store: keyof DBSchema): Promise<T[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve([]);
        return;
      }

      try {
        const transaction = this.db.transaction(store, 'readonly');
        const objectStore = transaction.objectStore(store);
        const request = objectStore.getAll();

        request.onsuccess = () => {
          resolve(request.result || []);
        };

        request.onerror = () => {
          console.error(`IndexedDB getAll error for ${store}:`, request.error);
          reject(request.error);
        };
      } catch (error) {
        console.error(`IndexedDB getAll error for ${store}:`, error);
        reject(error);
      }
    });
  }

  private async putToIndexedDB<T>(store: keyof DBSchema, key: string, value: T): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      try {
        const transaction = this.db.transaction(store, 'readwrite');
        const objectStore = transaction.objectStore(store);
        
        // Ensure the value has the correct key
        const valueWithKey = this.ensureKey(store, key, value);
        const request = objectStore.put(valueWithKey);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          console.error(`IndexedDB put error for ${store}/${key}:`, request.error);
          reject(request.error);
        };

        transaction.onerror = () => {
          console.error(`IndexedDB transaction error for ${store}/${key}:`, transaction.error);
          reject(transaction.error);
        };
      } catch (error) {
        console.error(`IndexedDB put error for ${store}/${key}:`, error);
        reject(error);
      }
    });
  }

  private async deleteFromIndexedDB(store: keyof DBSchema, key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      try {
        const transaction = this.db.transaction(store, 'readwrite');
        const objectStore = transaction.objectStore(store);
        const request = objectStore.delete(key);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          console.error(`IndexedDB delete error for ${store}/${key}:`, request.error);
          reject(request.error);
        };
      } catch (error) {
        console.error(`IndexedDB delete error for ${store}/${key}:`, error);
        reject(error);
      }
    });
  }

  private async clearIndexedDB(store: keyof DBSchema): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      try {
        const transaction = this.db.transaction(store, 'readwrite');
        const objectStore = transaction.objectStore(store);
        const request = objectStore.clear();

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          console.error(`IndexedDB clear error for ${store}:`, request.error);
          reject(request.error);
        };
      } catch (error) {
        console.error(`IndexedDB clear error for ${store}:`, error);
        reject(error);
      }
    });
  }

  // ============ LOCALSTORAGE FALLBACK ============

  /**
   * Fallback: obtiene un valor de localStorage
   * 
   * @requirements 1.4
   */
  private getFromLocalStorage<T>(store: keyof DBSchema, key: string): T | null {
    try {
      if (typeof localStorage === 'undefined') return null;
      
      const storeKey = `${LOCALSTORAGE_PREFIX}${store}`;
      const storeData = localStorage.getItem(storeKey);
      
      if (!storeData) return null;
      
      const parsed = JSON.parse(storeData) as Record<string, T>;
      return parsed[key] || null;
    } catch (error) {
      console.error(`localStorage get error for ${store}/${key}:`, error);
      return null;
    }
  }

  /**
   * Fallback: obtiene todos los valores de localStorage
   * 
   * @requirements 1.4
   */
  private getAllFromLocalStorage<T>(store: keyof DBSchema): T[] {
    try {
      if (typeof localStorage === 'undefined') return [];
      
      const storeKey = `${LOCALSTORAGE_PREFIX}${store}`;
      const storeData = localStorage.getItem(storeKey);
      
      if (!storeData) return [];
      
      const parsed = JSON.parse(storeData) as Record<string, T>;
      return Object.values(parsed);
    } catch (error) {
      console.error(`localStorage getAll error for ${store}:`, error);
      return [];
    }
  }

  /**
   * Fallback: guarda un valor en localStorage
   * 
   * @requirements 1.4
   */
  private putToLocalStorage<T>(store: keyof DBSchema, key: string, value: T): void {
    try {
      if (typeof localStorage === 'undefined') return;
      
      const storeKey = `${LOCALSTORAGE_PREFIX}${store}`;
      const storeData = localStorage.getItem(storeKey);
      
      const parsed = storeData ? JSON.parse(storeData) as Record<string, T> : {};
      parsed[key] = value;
      
      localStorage.setItem(storeKey, JSON.stringify(parsed));
    } catch (error) {
      console.error(`localStorage put error for ${store}/${key}:`, error);
      
      // Handle QuotaExceededError
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        this.handleQuotaExceeded(store);
      }
    }
  }

  /**
   * Fallback: elimina un valor de localStorage
   * 
   * @requirements 1.4
   */
  private deleteFromLocalStorage(store: keyof DBSchema, key: string): void {
    try {
      if (typeof localStorage === 'undefined') return;
      
      const storeKey = `${LOCALSTORAGE_PREFIX}${store}`;
      const storeData = localStorage.getItem(storeKey);
      
      if (!storeData) return;
      
      const parsed = JSON.parse(storeData) as Record<string, unknown>;
      delete parsed[key];
      
      localStorage.setItem(storeKey, JSON.stringify(parsed));
    } catch (error) {
      console.error(`localStorage delete error for ${store}/${key}:`, error);
    }
  }

  /**
   * Fallback: limpia todos los valores de un store en localStorage
   * 
   * @requirements 1.4
   */
  private clearLocalStorage(store: keyof DBSchema): void {
    try {
      if (typeof localStorage === 'undefined') return;
      
      const storeKey = `${LOCALSTORAGE_PREFIX}${store}`;
      localStorage.removeItem(storeKey);
    } catch (error) {
      console.error(`localStorage clear error for ${store}:`, error);
    }
  }

  // ============ HELPERS ============

  /**
   * Añade timestamp al valor si no lo tiene
   */
  private addTimestamp<T>(value: T): T {
    if (typeof value === 'object' && value !== null) {
      const obj = value as Record<string, unknown>;
      if (!('timestamp' in obj) && !('createdAt' in obj)) {
        return { ...obj, timestamp: Date.now() } as T;
      }
    }
    return value;
  }

  /**
   * Asegura que el valor tenga la clave correcta según el keyPath del store
   */
  private ensureKey<T>(store: keyof DBSchema, key: string, value: T): T {
    const config = STORES[store];
    if (typeof value === 'object' && value !== null) {
      const obj = value as Record<string, unknown>;
      if (!(config.keyPath in obj)) {
        return { ...obj, [config.keyPath]: key } as T;
      }
    }
    return value;
  }

  /**
   * Maneja el error de cuota excedida limpiando datos antiguos
   */
  private handleQuotaExceeded(store: keyof DBSchema): void {
    console.warn(`Storage quota exceeded for ${store}, attempting cleanup`);
    
    try {
      // Try to clear old data from the store
      const storeKey = `${LOCALSTORAGE_PREFIX}${store}`;
      const storeData = localStorage.getItem(storeKey);
      
      if (storeData) {
        const parsed = JSON.parse(storeData) as Record<string, { timestamp?: number }>;
        const entries = Object.entries(parsed);
        
        // Sort by timestamp and keep only the newest half
        entries.sort((a, b) => (b[1].timestamp || 0) - (a[1].timestamp || 0));
        const keepCount = Math.floor(entries.length / 2);
        const newData = Object.fromEntries(entries.slice(0, keepCount));
        
        localStorage.setItem(storeKey, JSON.stringify(newData));
      }
    } catch (error) {
      console.error('Failed to handle quota exceeded:', error);
    }
  }

  /**
   * Cierra la conexión a la base de datos
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.initPromise = null;
  }
}

// ============ SINGLETON INSTANCE ============

let indexedDBServiceInstance: IndexedDBService | null = null;

/**
 * Obtiene la instancia singleton del servicio IndexedDB
 */
export function getIndexedDBService(): IndexedDBService {
  if (!indexedDBServiceInstance) {
    indexedDBServiceInstance = new IndexedDBService();
  }
  return indexedDBServiceInstance;
}

/**
 * Resetea la instancia singleton (útil para tests)
 */
export function resetIndexedDBService(): void {
  if (indexedDBServiceInstance) {
    indexedDBServiceInstance.close();
    indexedDBServiceInstance = null;
  }
}
