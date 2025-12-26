/**
 * IStorage - Puerto para persistencia de datos
 * 
 * Esta interfaz define el contrato para almacenamiento de datos.
 * Permite cambiar entre localStorage, IndexedDB, Supabase, etc.
 * sin afectar la lógica de negocio.
 */

export interface StorageOptions {
  /** Namespace para evitar colisiones */
  namespace?: string;
  /** TTL en milisegundos (opcional) */
  ttl?: number;
}

/**
 * Interfaz principal para almacenamiento
 */
export interface IStorage {
  /** Identificador del proveedor */
  readonly storageId: string;
  
  /** Guardar valor */
  set<T>(key: string, value: T, options?: StorageOptions): Promise<void>;
  
  /** Obtener valor */
  get<T>(key: string): Promise<T | null>;
  
  /** Eliminar valor */
  remove(key: string): Promise<void>;
  
  /** Verificar si existe */
  has(key: string): Promise<boolean>;
  
  /** Obtener todas las claves con un prefijo */
  keys(prefix?: string): Promise<string[]>;
  
  /** Limpiar todo el storage (o por namespace) */
  clear(namespace?: string): Promise<void>;
}

/**
 * Interfaz para storage con suscripciones (reactivo)
 */
export interface IReactiveStorage extends IStorage {
  /** Suscribirse a cambios de una clave */
  subscribe<T>(key: string, callback: (value: T | null) => void): () => void;
  
  /** Suscribirse a cambios de múltiples claves */
  subscribeMany<T>(keys: string[], callback: (values: Record<string, T | null>) => void): () => void;
}

/**
 * Interfaz para storage con historial (para analytics)
 */
export interface IHistoricalStorage extends IStorage {
  /** Añadir entrada a una lista */
  append<T>(key: string, value: T, maxItems?: number): Promise<void>;
  
  /** Obtener lista completa */
  getList<T>(key: string): Promise<T[]>;
  
  /** Obtener rango de fechas */
  getByDateRange<T>(key: string, from: Date, to: Date): Promise<T[]>;
}
