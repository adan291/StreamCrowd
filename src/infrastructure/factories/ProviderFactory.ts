/**
 * ProviderFactory - Factory para crear instancias de proveedores
 * 
 * Esta factory permite crear el proveedor correcto basándose en
 * configuración, facilitando añadir nuevos proveedores (OBS, YouTube)
 * sin modificar el código existente.
 */

import type { IChatProvider, IMultiChannelProvider } from '../../domain/ports/IChatProvider';
import type { IOverlaySync } from '../../domain/ports/IOverlaySync';
import type { IStorage, IReactiveStorage } from '../../domain/ports/IStorage';

import { TwitchAdapter, getTwitchAdapter } from '../adapters/TwitchAdapter';
import { FirebaseSyncAdapter, getFirebaseSyncAdapter } from '../adapters/FirebaseSyncAdapter';
import { LocalStorageAdapter, getLocalStorageAdapter } from '../adapters/LocalStorageAdapter';

export type ChatProviderType = 'twitch' | 'youtube' | 'obs' | 'custom';
export type SyncProviderType = 'firebase' | 'websocket' | 'broadcast' | 'obs';
export type StorageProviderType = 'localStorage' | 'indexedDB' | 'supabase';

interface ProviderConfig {
  chat?: {
    type: ChatProviderType;
    options?: Record<string, unknown>;
  };
  sync?: {
    type: SyncProviderType;
    options?: Record<string, unknown>;
  };
  storage?: {
    type: StorageProviderType;
    options?: Record<string, unknown>;
  };
}

/**
 * Factory para crear proveedores de chat
 */
export function createChatProvider(
  type: ChatProviderType = 'twitch',
  options?: Record<string, unknown>
): IChatProvider {
  switch (type) {
    case 'twitch':
      return new TwitchAdapter(options);
    
    case 'youtube':
      // TODO: Implementar YouTubeAdapter
      throw new Error('YouTube provider not implemented yet');
    
    case 'obs':
      // TODO: Implementar OBSAdapter
      throw new Error('OBS provider not implemented yet');
    
    case 'custom':
      throw new Error('Custom provider requires manual implementation');
    
    default:
      throw new Error(`Unknown chat provider type: ${type}`);
  }
}

/**
 * Factory para crear proveedores de sincronización
 */
export function createSyncProvider(
  type: SyncProviderType = 'firebase',
  options?: Record<string, unknown>
): IOverlaySync {
  switch (type) {
    case 'firebase':
      return new FirebaseSyncAdapter(options);
    
    case 'websocket':
      // TODO: Implementar WebSocketSyncAdapter
      throw new Error('WebSocket sync provider not implemented yet');
    
    case 'broadcast':
      // TODO: Implementar BroadcastChannelAdapter
      throw new Error('BroadcastChannel sync provider not implemented yet');
    
    case 'obs':
      // TODO: Implementar OBSWebSocketAdapter
      throw new Error('OBS WebSocket sync provider not implemented yet');
    
    default:
      throw new Error(`Unknown sync provider type: ${type}`);
  }
}

/**
 * Factory para crear proveedores de almacenamiento
 */
export function createStorageProvider(
  type: StorageProviderType = 'localStorage',
  options?: Record<string, unknown>
): IStorage {
  switch (type) {
    case 'localStorage':
      return new LocalStorageAdapter(options?.prefix as string);
    
    case 'indexedDB':
      // TODO: Implementar IndexedDBAdapter
      throw new Error('IndexedDB storage provider not implemented yet');
    
    case 'supabase':
      // TODO: Implementar SupabaseAdapter
      throw new Error('Supabase storage provider not implemented yet');
    
    default:
      throw new Error(`Unknown storage provider type: ${type}`);
  }
}

/**
 * Container de dependencias - Singleton que mantiene las instancias
 */
class DependencyContainer {
  private chatProvider: IChatProvider | null = null;
  private syncProvider: IOverlaySync | null = null;
  private storageProvider: IStorage | null = null;
  
  getChatProvider(): IChatProvider {
    if (!this.chatProvider) {
      this.chatProvider = getTwitchAdapter();
    }
    return this.chatProvider;
  }
  
  getSyncProvider(): IOverlaySync {
    if (!this.syncProvider) {
      this.syncProvider = getFirebaseSyncAdapter();
    }
    return this.syncProvider;
  }
  
  getStorageProvider(): IReactiveStorage {
    if (!this.storageProvider) {
      this.storageProvider = getLocalStorageAdapter();
    }
    return this.storageProvider as IReactiveStorage;
  }
  
  setChatProvider(provider: IChatProvider): void {
    if (this.chatProvider) {
      this.chatProvider.dispose();
    }
    this.chatProvider = provider;
  }
  
  setSyncProvider(provider: IOverlaySync): void {
    if (this.syncProvider) {
      this.syncProvider.dispose();
    }
    this.syncProvider = provider;
  }
  
  setStorageProvider(provider: IStorage): void {
    this.storageProvider = provider;
  }
  
  configure(config: ProviderConfig): void {
    if (config.chat) {
      this.setChatProvider(createChatProvider(config.chat.type, config.chat.options));
    }
    if (config.sync) {
      this.setSyncProvider(createSyncProvider(config.sync.type, config.sync.options));
    }
    if (config.storage) {
      this.setStorageProvider(createStorageProvider(config.storage.type, config.storage.options));
    }
  }
  
  dispose(): void {
    this.chatProvider?.dispose();
    this.syncProvider?.dispose();
    this.chatProvider = null;
    this.syncProvider = null;
    this.storageProvider = null;
  }
}

// Singleton instance
export const container = new DependencyContainer();

/**
 * Hook-friendly getters
 */
export const getChatProvider = () => container.getChatProvider();
export const getSyncProvider = () => container.getSyncProvider();
export const getStorageProvider = () => container.getStorageProvider();
